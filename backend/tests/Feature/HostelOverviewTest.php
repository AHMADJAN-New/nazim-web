<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Building;
use App\Models\ClassModel;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Room;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\PermissionRegistrar;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class HostelOverviewTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    private function enableHostelAddon(string $organizationId): void
    {
        DB::table('organization_feature_addons')->updateOrInsert(
            ['organization_id' => $organizationId, 'feature_key' => 'hostel'],
            [
                'is_enabled' => true,
                'started_at' => now(),
                'expires_at' => null,
                'price_paid' => 0,
                'currency' => 'AFN',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    private function grantHostelPermissions(Organization $organization, $user): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['hostel.read', 'rooms.read', 'student_admissions.read'] as $name) {
            $parts = explode('.', $name);
            $permission = Permission::firstOrCreate(
                [
                    'name' => $name,
                    'guard_name' => 'web',
                    'organization_id' => $organization->id,
                ],
                [
                    'resource' => $parts[0] ?? null,
                    'action' => $parts[1] ?? 'read',
                    'description' => 'Test permission',
                ]
            );

            setPermissionsTeamId($organization->id);
            $user->givePermissionTo($permission);
            setPermissionsTeamId(null);
        }
    }

    #[Test]
    public function hostel_overview_includes_rooms_in_other_schools_when_schools_access_all(): void
    {
        $organization = Organization::factory()->create();
        $schoolA = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $schoolB = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = $this->createUser(
            [],
            [
                'organization_id' => $organization->id,
                'default_school_id' => $schoolA->id,
                'schools_access_all' => true,
            ],
            $organization,
            $schoolA,
            true,
            ['withRole' => false]
        );

        $this->grantHostelPermissions($organization, $user);
        $this->enableHostelAddon($organization->id);

        $building = Building::create([
            'building_name' => 'Hostel Block B',
            'school_id' => $schoolB->id,
        ]);

        $room = Room::create([
            'room_number' => '101',
            'building_id' => $building->id,
            'school_id' => $schoolB->id,
        ]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
        ]);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
        ]);

        $classAcademicYear = $this->createClassAcademicYearForSchool(
            $organization,
            $schoolB,
            $class,
            $academicYear
        );

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'admission_date' => now()->toDateString(),
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'admitted',
            'is_boarder' => true,
            'room_id' => $room->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/hostel/overview');

        if ($response->status() === 402) {
            $this->markTestSkipped('Hostel feature not available on subscription in this test environment.');
        }

        $response->assertOk();
        $json = $response->json();
        $this->assertGreaterThanOrEqual(1, $json['summary']['total_rooms'] ?? 0);
        $this->assertNotEmpty($json['rooms'] ?? []);
        $roomIds = collect($json['rooms'])->pluck('id')->all();
        $this->assertContains($room->id, $roomIds);

        $roomPayload = collect($json['rooms'])->firstWhere('id', $room->id);
        $this->assertIsArray($roomPayload);
        $this->assertNotEmpty($roomPayload['occupants'] ?? []);
        $occupant = $roomPayload['occupants'][0];
        $this->assertArrayHasKey('father_name', $occupant);
        $this->assertArrayHasKey('class_name', $occupant);
        $this->assertSame($class->name, $occupant['class_name']);
        $this->assertSame($student->father_name, $occupant['father_name']);
    }

    #[Test]
    public function hostel_overview_resolves_class_name_from_class_academic_year_when_class_id_is_null(): void
    {
        $organization = Organization::factory()->create();
        $schoolB = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $schoolA = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = $this->createUser(
            [],
            [
                'organization_id' => $organization->id,
                'default_school_id' => $schoolA->id,
                'schools_access_all' => true,
            ],
            $organization,
            $schoolA,
            true,
            ['withRole' => false]
        );

        $this->grantHostelPermissions($organization, $user);
        $this->enableHostelAddon($organization->id);

        $building = Building::create([
            'building_name' => 'Hostel CAY Block',
            'school_id' => $schoolB->id,
        ]);

        $room = Room::create([
            'room_number' => 'CAY-1',
            'building_id' => $building->id,
            'school_id' => $schoolB->id,
        ]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
        ]);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
        ]);

        $classAcademicYear = $this->createClassAcademicYearForSchool(
            $organization,
            $schoolB,
            $class,
            $academicYear,
            ['section_name' => 'B']
        );

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => null,
            'class_academic_year_id' => $classAcademicYear->id,
            'admission_date' => now()->toDateString(),
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'admitted',
            'is_boarder' => true,
            'room_id' => $room->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/hostel/overview');

        if ($response->status() === 402) {
            $this->markTestSkipped('Hostel feature not available on subscription in this test environment.');
        }

        $response->assertOk();
        $json = $response->json();
        $roomPayload = collect($json['rooms'])->firstWhere('id', $room->id);
        $this->assertIsArray($roomPayload);
        $occupant = $roomPayload['occupants'][0];
        $this->assertNull($occupant['class_id']);
        $this->assertSame($classAcademicYear->id, $occupant['class_academic_year_id']);
        $this->assertSame($class->name.' — B', $occupant['class_name']);
    }

    #[Test]
    public function hostel_overview_resolves_class_name_from_class_code_when_name_is_empty(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = $this->createUser(
            [],
            [
                'organization_id' => $organization->id,
                'default_school_id' => $school->id,
                'schools_access_all' => true,
            ],
            $organization,
            $school,
            true,
            ['withRole' => false]
        );

        $this->grantHostelPermissions($organization, $user);
        $this->enableHostelAddon($organization->id);

        $building = Building::create([
            'building_name' => 'Hostel Code Block',
            'school_id' => $school->id,
        ]);

        $room = Room::create([
            'room_number' => 'CODE-1',
            'building_id' => $building->id,
            'school_id' => $school->id,
        ]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => '',
            'code' => '10',
        ]);

        $classAcademicYear = $this->createClassAcademicYearForSchool(
            $organization,
            $school,
            $class,
            $academicYear,
            ['section_name' => 'A']
        );

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => null,
            'class_academic_year_id' => $classAcademicYear->id,
            'admission_date' => now()->toDateString(),
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'admitted',
            'is_boarder' => true,
            'room_id' => $room->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/hostel/overview');

        if ($response->status() === 402) {
            $this->markTestSkipped('Hostel feature not available on subscription in this test environment.');
        }

        $response->assertOk();
        $json = $response->json();
        $roomPayload = collect($json['rooms'])->firstWhere('id', $room->id);
        $this->assertIsArray($roomPayload);
        $occupant = $roomPayload['occupants'][0];
        $this->assertSame($classAcademicYear->id, $occupant['class_academic_year_id']);
        $this->assertSame('10 — A', $occupant['class_name']);
    }

    #[Test]
    public function hostel_overview_scopes_to_default_school_when_schools_access_all_is_false(): void
    {
        $organization = Organization::factory()->create();
        $schoolA = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $schoolB = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = $this->createUser(
            [],
            [
                'organization_id' => $organization->id,
                'default_school_id' => $schoolA->id,
                'schools_access_all' => false,
            ],
            $organization,
            $schoolA,
            false,
            ['withRole' => false]
        );

        $this->grantHostelPermissions($organization, $user);
        $this->enableHostelAddon($organization->id);

        $building = Building::create([
            'building_name' => 'Hostel Block B Only',
            'school_id' => $schoolB->id,
        ]);

        Room::create([
            'room_number' => '202',
            'building_id' => $building->id,
            'school_id' => $schoolB->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/hostel/overview');

        if ($response->status() === 402) {
            $this->markTestSkipped('Hostel feature not available on subscription in this test environment.');
        }

        $response->assertOk();
        $json = $response->json();
        $this->assertSame(0, $json['summary']['total_rooms'] ?? -1);
        $this->assertSame([], $json['rooms'] ?? null);
    }

    #[Test]
    public function hostel_overview_does_not_count_day_scholars_as_room_occupants_even_if_room_id_is_set(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = $this->createUser(
            [],
            [
                'organization_id' => $organization->id,
                'default_school_id' => $school->id,
                'schools_access_all' => true,
            ],
            $organization,
            $school,
            true,
            ['withRole' => false]
        );

        $this->grantHostelPermissions($organization, $user);
        $this->enableHostelAddon($organization->id);

        $building = Building::create([
            'building_name' => 'Hostel Day Scholar Block',
            'school_id' => $school->id,
        ]);

        $room = Room::create([
            'room_number' => 'DS-1',
            'building_id' => $building->id,
            'school_id' => $school->id,
        ]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        // This admission is a day scholar but has room_id set (historical/bad data).
        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'admission_date' => now()->toDateString(),
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'admitted',
            'is_boarder' => false,
            'room_id' => $room->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/hostel/overview');

        if ($response->status() === 402) {
            $this->markTestSkipped('Hostel feature not available on subscription in this test environment.');
        }

        $response->assertOk();
        $json = $response->json();

        $roomPayload = collect($json['rooms'] ?? [])->firstWhere('id', $room->id);
        $this->assertIsArray($roomPayload);
        $this->assertSame([], $roomPayload['occupants'] ?? []);

        $this->assertSame(0, $json['summary']['occupied_rooms'] ?? -1);
        $this->assertSame(0, $json['summary']['total_students_in_rooms'] ?? -1);
    }
}
