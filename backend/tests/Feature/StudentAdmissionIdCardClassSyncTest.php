<?php

namespace Tests\Feature;

use App\Models\IdCardTemplate;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\StudentIdCard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\PermissionRegistrar;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class StudentAdmissionIdCardClassSyncTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    private function createUserWithAdmissionRead(Organization $organization, SchoolBranding $school)
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

    private function createUserWithAdmissionUpdate(Organization $organization, SchoolBranding $school)
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
        setPermissionsTeamId($organization->id);
        $user->givePermissionTo(Permission::firstOrCreate([
            'name' => 'student_admissions.update',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]));
        setPermissionsTeamId(null);

        return $user;
    }

    #[Test]
    public function put_admission_section_change_syncs_student_id_card_and_clears_print_state(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUserWithAdmissionRead($organization, $school);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $cayA = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'A']);
        $cayB = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'B']);

        $student = $this->createStudentForSchool($organization, $school);
        $admission = $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $student,
            $academicYear,
            $class,
            $cayA
        );

        $template = IdCardTemplate::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Test template',
            'is_active' => true,
        ]);

        $card = StudentIdCard::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'student_admission_id' => $admission->id,
            'id_card_template_id' => $template->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $cayA->id,
            'is_printed' => true,
            'printed_at' => now(),
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/student-admissions/{$admission->id}", [
            'class_academic_year_id' => $cayB->id,
            'class_id' => $class->id,
        ]);

        $response->assertOk();

        $admission->refresh();
        $this->assertSame($cayB->id, $admission->class_academic_year_id);

        $card->refresh();
        $this->assertSame($cayB->id, $card->class_academic_year_id);
        $this->assertFalse($card->is_printed);
        $this->assertNull($card->printed_at);
        $this->assertNull($card->printed_by);
    }

    #[Test]
    public function bulk_assign_placement_syncs_student_id_card_for_affected_students(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUserWithAdmissionUpdate($organization, $school);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $cayA = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'A']);
        $cayB = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'B']);

        $student = $this->createStudentForSchool($organization, $school);
        $admission = $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $student,
            $academicYear,
            $class,
            $cayA
        );

        $template = IdCardTemplate::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Test template',
            'is_active' => true,
        ]);

        $card = StudentIdCard::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'student_admission_id' => $admission->id,
            'id_card_template_id' => $template->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $cayA->id,
            'is_printed' => true,
            'printed_at' => now(),
        ]);

        $this->jsonAs($user, 'POST', '/api/student-admissions/bulk-assign-placement', [
            'admission_ids' => [$admission->id],
            'class_academic_year_id' => $cayB->id,
            'is_boarder' => false,
        ])->assertOk();

        $card->refresh();
        $this->assertSame($cayB->id, $card->class_academic_year_id);
        $this->assertFalse($card->is_printed);
    }

    #[Test]
    public function artisan_backfill_command_reports_mismatches_in_dry_run(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $cayA = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'A']);
        $cayB = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'B']);

        $student = $this->createStudentForSchool($organization, $school);
        $admission = $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $student,
            $academicYear,
            $class,
            $cayB
        );

        $template = IdCardTemplate::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Test template',
            'is_active' => true,
        ]);

        StudentIdCard::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'student_admission_id' => $admission->id,
            'id_card_template_id' => $template->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $cayA->id,
            'is_printed' => true,
            'printed_at' => now(),
        ]);

        Artisan::call('student-id-cards:sync-class-from-admissions', [
            '--student-id' => $student->id,
            '--dry-run' => true,
        ]);

        $this->assertStringContainsString('Mismatched', Artisan::output());
    }

    #[Test]
    public function artisan_rejects_all_without_dry_run_or_force(): void
    {
        $exit = Artisan::call('student-id-cards:sync-class-from-admissions', [
            '--all' => true,
        ]);

        $this->assertSame(1, $exit);
        $this->assertStringContainsString('--dry-run', Artisan::output());
    }
}
