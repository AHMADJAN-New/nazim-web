<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSeatAssignment;
use App\Models\ExamSeatingClassColor;
use App\Models\ExamSeatingMap;
use App\Models\ExamSeatingRun;
use App\Models\ExamStudent;
use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use Database\Seeders\PermissionSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ExamSeatingSchemaTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function seating_tables_have_required_tenant_and_lifecycle_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('exam_seating_maps', [
            'id', 'organization_id', 'school_id', 'exam_id', 'room_id', 'name',
            'rows', 'columns', 'start_seat_number', 'status', 'revision',
            'input_checksum', 'solver_status', 'solver_diagnostics', 'applied_at',
            'applied_by', 'finalized_at', 'finalized_by', 'created_at', 'updated_at',
            'deleted_at',
        ]));
        $this->assertTrue(Schema::hasColumns('exam_seat_assignments', [
            'id', 'organization_id', 'school_id', 'exam_seating_map_id', 'exam_id',
            'exam_student_id', 'row_number', 'column_number', 'seat_number',
            'is_locked', 'is_disabled', 'locked_at', 'locked_by', 'created_at',
            'updated_at', 'deleted_at',
        ]));
        $this->assertTrue(Schema::hasColumns('exam_seating_class_colors', [
            'id', 'organization_id', 'school_id', 'exam_seating_map_id',
            'exam_class_id', 'color_hex', 'created_at', 'updated_at', 'deleted_at',
        ]));
        $this->assertTrue(Schema::hasColumns('exam_seating_runs', [
            'id', 'organization_id', 'school_id', 'exam_seating_map_id', 'exam_id',
            'revision', 'input_checksum', 'algorithm_version', 'idempotency_key',
            'status', 'seed', 'conflict_count', 'diagnostics', 'error_message',
            'started_at', 'completed_at', 'failed_at', 'created_at', 'updated_at',
        ]));
    }

    #[Test]
    public function seating_models_generate_uuids_and_expose_expected_relationships(): void
    {
        [$organization, $school, $exam, $examClass, $examStudent] = $this->createExamContext();

        $map = ExamSeatingMap::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'name' => 'Main Hall',
            'rows' => 4,
            'columns' => 5,
        ]);
        $assignment = ExamSeatAssignment::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $exam->id,
            'exam_student_id' => $examStudent->id,
            'row_number' => 1,
            'column_number' => 1,
            'seat_number' => 1,
        ]);
        $color = ExamSeatingClassColor::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_seating_map_id' => $map->id,
            'exam_class_id' => $examClass->id,
            'color_hex' => '#1D4ED8',
        ]);
        $run = ExamSeatingRun::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $exam->id,
            'revision' => 1,
            'input_checksum' => str_repeat('a', 64),
            'algorithm_version' => 'v1',
            'idempotency_key' => 'seating-test-run',
        ]);

        foreach ([$map, $assignment, $color, $run] as $model) {
            $this->assertTrue(\Ramsey\Uuid\Uuid::isValid($model->id));
        }

        $this->assertTrue($map->exam->is($exam));
        $this->assertTrue($assignment->seatingMap->is($map));
        $this->assertTrue($assignment->examStudent->is($examStudent));
        $this->assertTrue($color->examClass->is($examClass));
        $this->assertTrue($run->seatingMap->is($map));
        $this->assertTrue($exam->seatingMaps->contains($map));
        $this->assertTrue($examStudent->seatAssignment->is($assignment));
    }

    #[Test]
    public function seating_map_and_run_lifecycle_defaults_are_stable(): void
    {
        [$organization, $school, $exam] = $this->createExamContext();

        $map = ExamSeatingMap::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'name' => 'Default lifecycle',
            'rows' => 2,
            'columns' => 3,
        ]);
        $run = ExamSeatingRun::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $exam->id,
            'revision' => $map->revision,
            'input_checksum' => str_repeat('b', 64),
            'algorithm_version' => 'v1',
            'idempotency_key' => 'default-lifecycle-run',
        ]);

        $this->assertSame(ExamSeatingMap::STATUS_DRAFT, $map->status);
        $this->assertSame(ExamSeatingMap::SOLVER_NOT_RUN, $map->solver_status);
        $this->assertSame(1, $map->revision);
        $this->assertSame(1, $map->start_seat_number);
        $this->assertSame(ExamSeatingRun::STATUS_PENDING, $run->status);
        $this->assertSame(0, $run->conflict_count);
        $this->assertNull($run->deleted_at ?? null);
    }

    #[Test]
    public function tenant_scopes_filter_maps_by_organization_and_school(): void
    {
        [$organization, $school, $exam] = $this->createExamContext();
        [$otherOrganization, $otherSchool, $otherExam] = $this->createExamContext();

        $expected = ExamSeatingMap::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'name' => 'Expected',
            'rows' => 1,
            'columns' => 1,
        ]);
        ExamSeatingMap::create([
            'organization_id' => $otherOrganization->id,
            'school_id' => $otherSchool->id,
            'exam_id' => $otherExam->id,
            'name' => 'Other tenant',
            'rows' => 1,
            'columns' => 1,
        ]);

        $maps = ExamSeatingMap::query()
            ->forOrganization($organization->id)
            ->forSchool($school->id)
            ->get();

        $this->assertCount(1, $maps);
        $this->assertTrue($maps->first()->is($expected));
    }

    #[Test]
    public function a_live_map_cannot_reuse_a_coordinate(): void
    {
        [$organization, $school, $exam, , $examStudent] = $this->createExamContext();
        $otherExamStudent = $this->createExamStudent($organization, $school, $exam);
        $map = $this->createMap($organization, $school, $exam);

        $this->createAssignment($organization, $school, $exam, $map, $examStudent, 1, 1, 1);

        $this->expectException(QueryException::class);
        $this->createAssignment($organization, $school, $exam, $map, $otherExamStudent, 1, 1, 2);
    }

    #[Test]
    public function a_live_exam_cannot_assign_the_same_student_twice(): void
    {
        [$organization, $school, $exam, , $examStudent] = $this->createExamContext();
        $map = $this->createMap($organization, $school, $exam);

        $this->createAssignment($organization, $school, $exam, $map, $examStudent, 1, 1, 1);

        $this->expectException(QueryException::class);
        $this->createAssignment($organization, $school, $exam, $map, $examStudent, 1, 2, 2);
    }

    #[Test]
    public function a_live_exam_cannot_reuse_a_global_seat_number(): void
    {
        [$organization, $school, $exam, , $examStudent] = $this->createExamContext();
        $otherExamStudent = $this->createExamStudent($organization, $school, $exam);
        $map = $this->createMap($organization, $school, $exam);

        $this->createAssignment($organization, $school, $exam, $map, $examStudent, 1, 1, 1);

        $this->expectException(QueryException::class);
        $this->createAssignment($organization, $school, $exam, $map, $otherExamStudent, 1, 2, 1);
    }

    #[Test]
    public function soft_deleted_assignment_releases_student_coordinate_and_seat_number(): void
    {
        [$organization, $school, $exam, , $examStudent] = $this->createExamContext();
        $map = $this->createMap($organization, $school, $exam);
        $assignment = $this->createAssignment(
            $organization,
            $school,
            $exam,
            $map,
            $examStudent,
            1,
            1,
            1
        );
        $assignment->delete();

        $replacement = $this->createAssignment(
            $organization,
            $school,
            $exam,
            $map,
            $examStudent,
            1,
            1,
            1
        );

        $this->assertNotSame($assignment->id, $replacement->id);
    }

    #[Test]
    public function disabled_seats_must_not_reference_students(): void
    {
        [$organization, $school, $exam, , $examStudent] = $this->createExamContext();
        $map = $this->createMap($organization, $school, $exam);

        $this->expectException(QueryException::class);
        ExamSeatAssignment::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $exam->id,
            'exam_student_id' => $examStudent->id,
            'row_number' => 1,
            'column_number' => 1,
            'seat_number' => 1,
            'is_disabled' => true,
        ]);
    }

    #[Test]
    public function a_live_map_has_only_one_color_per_exam_class(): void
    {
        [$organization, $school, $exam, $examClass] = $this->createExamContext();
        $map = $this->createMap($organization, $school, $exam);

        ExamSeatingClassColor::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_seating_map_id' => $map->id,
            'exam_class_id' => $examClass->id,
            'color_hex' => '#111111',
        ]);

        $this->expectException(QueryException::class);
        ExamSeatingClassColor::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_seating_map_id' => $map->id,
            'exam_class_id' => $examClass->id,
            'color_hex' => '#222222',
        ]);
    }

    #[Test]
    public function seating_permissions_are_global_and_assigned_to_exam_management_roles(): void
    {
        $permissions = [
            'exam_seating_maps.read',
            'exam_seating_maps.create',
            'exam_seating_maps.update',
            'exam_seating_maps.delete',
            'exam_seating_maps.assign',
            'exam_seating_maps.print',
        ];

        $this->assertEqualsCanonicalizing(
            $permissions,
            array_values(array_intersect($permissions, PermissionSeeder::getAllPermissionNames()))
        );

        $rolePermissions = PermissionSeeder::getRolePermissions();
        foreach (['admin', 'organization_admin', 'exam_controller'] as $role) {
            $this->assertEqualsCanonicalizing(
                $permissions,
                array_values(array_intersect($permissions, $rolePermissions[$role]))
            );
        }

        $organization = Organization::factory()->create();
        app(PermissionSeeder::class)->run();

        foreach ($permissions as $permission) {
            $this->assertDatabaseHas('permissions', [
                'name' => $permission,
                'guard_name' => 'web',
                'organization_id' => null,
            ]);
        }

        foreach (['admin', 'organization_admin', 'exam_controller'] as $roleName) {
            $assignedPermissionNames = DB::table('role_has_permissions')
                ->join('roles', 'roles.id', '=', 'role_has_permissions.role_id')
                ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
                ->where('roles.name', $roleName)
                ->where('roles.organization_id', $organization->id)
                ->where('role_has_permissions.organization_id', $organization->id)
                ->whereIn('permissions.name', $permissions)
                ->pluck('permissions.name')
                ->all();

            $this->assertEqualsCanonicalizing($permissions, $assignedPermissionNames);
        }
    }

    /**
     * @return array{Organization, SchoolBranding, Exam, ExamClass, ExamStudent}
     */
    private function createExamContext(): array
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $classAcademicYear = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
        ]);
        $exam = Exam::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
        ]);
        $examClass = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $examStudent = $this->createExamStudent($organization, $school, $exam, $examClass);

        return [$organization, $school, $exam, $examClass, $examStudent];
    }

    private function createExamStudent(
        Organization $organization,
        SchoolBranding $school,
        Exam $exam,
        ?ExamClass $examClass = null
    ): ExamStudent {
        $examClass ??= $exam->examClasses()->firstOrFail();
        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $admission = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_year_id' => $exam->academic_year_id,
            'class_id' => $examClass->classAcademicYear->class_id,
            'class_academic_year_id' => $examClass->class_academic_year_id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        return ExamStudent::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'student_admission_id' => $admission->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
    }

    private function createMap(
        Organization $organization,
        SchoolBranding $school,
        Exam $exam
    ): ExamSeatingMap {
        return ExamSeatingMap::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'name' => 'Constraint map',
            'rows' => 3,
            'columns' => 3,
        ]);
    }

    private function createAssignment(
        Organization $organization,
        SchoolBranding $school,
        Exam $exam,
        ExamSeatingMap $map,
        ExamStudent $examStudent,
        int $row,
        int $column,
        int $seatNumber
    ): ExamSeatAssignment {
        return ExamSeatAssignment::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $exam->id,
            'exam_student_id' => $examStudent->id,
            'row_number' => $row,
            'column_number' => $column,
            'seat_number' => $seatNumber,
        ]);
    }
}
