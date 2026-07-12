<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Building;
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
use App\Models\Room;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use DomainException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use LogicException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ExamSeatingIntegrityTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function seating_runs_reject_normal_model_updates(): void
    {
        $context = $this->createExamContext();
        $map = $this->createMap($context);
        $run = $this->createRun($context, $map, 'immutable-update');

        $this->expectException(LogicException::class);
        $run->update(['status' => ExamSeatingRun::STATUS_RUNNING]);
    }

    #[Test]
    public function seating_runs_reject_normal_model_deletes(): void
    {
        $context = $this->createExamContext();
        $map = $this->createMap($context);
        $run = $this->createRun($context, $map, 'immutable-delete');

        $this->expectException(LogicException::class);
        $run->delete();
    }

    #[Test]
    public function database_rejects_direct_seating_run_updates(): void
    {
        $context = $this->createExamContext();
        $map = $this->createMap($context);
        $run = $this->createRun($context, $map, 'database-update');

        $this->expectException(QueryException::class);
        DB::table('exam_seating_runs')
            ->where('id', $run->id)
            ->update(['status' => ExamSeatingRun::STATUS_RUNNING]);
    }

    #[Test]
    public function database_rejects_direct_seating_run_deletes(): void
    {
        $context = $this->createExamContext();
        $map = $this->createMap($context);
        $run = $this->createRun($context, $map, 'database-delete');

        $this->expectException(QueryException::class);
        DB::table('exam_seating_runs')->where('id', $run->id)->delete();
    }

    #[Test]
    public function immutable_runs_restrict_hard_deletion_of_their_parent_map(): void
    {
        $context = $this->createExamContext();
        $map = $this->createMap($context);
        $this->createRun($context, $map, 'restrict-map-delete');

        $this->expectException(QueryException::class);
        DB::table('exam_seating_maps')->where('id', $map->id)->delete();
    }

    #[Test]
    public function seating_map_allows_a_null_room(): void
    {
        $context = $this->createExamContext();

        $map = $this->createMap($context);

        $this->assertNull($map->room_id);
    }

    #[Test]
    public function seating_map_model_rejects_a_room_from_another_school(): void
    {
        $organization = Organization::factory()->create();
        $context = $this->createExamContext($organization);
        $otherContext = $this->createExamContext($organization);
        $otherRoom = $this->createRoom($otherContext);

        $this->expectException(DomainException::class);
        ExamSeatingMap::create([
            'organization_id' => $organization->id,
            'school_id' => $context['school']->id,
            'exam_id' => $context['exam']->id,
            'room_id' => $otherRoom->id,
            'name' => 'Wrong school room',
            'rows' => 2,
            'columns' => 2,
        ]);
    }

    #[Test]
    public function database_rejects_a_map_room_from_another_school(): void
    {
        $organization = Organization::factory()->create();
        $context = $this->createExamContext($organization);
        $otherContext = $this->createExamContext($organization);
        $otherRoom = $this->createRoom($otherContext);

        $this->expectException(QueryException::class);
        DB::table('exam_seating_maps')->insert([
            'id' => fake()->uuid(),
            'organization_id' => $organization->id,
            'school_id' => $context['school']->id,
            'exam_id' => $context['exam']->id,
            'room_id' => $otherRoom->id,
            'name' => 'Wrong school room',
            'rows' => 2,
            'columns' => 2,
        ]);
    }

    #[Test]
    public function database_rejects_a_map_whose_exam_has_another_tenant_scope(): void
    {
        $context = $this->createExamContext();
        $otherContext = $this->createExamContext();

        $this->expectException(QueryException::class);
        DB::table('exam_seating_maps')->insert([
            'id' => fake()->uuid(),
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_id' => $otherContext['exam']->id,
            'name' => 'Wrong exam tenant',
            'rows' => 2,
            'columns' => 2,
        ]);
    }

    #[Test]
    public function database_rejects_an_assignment_whose_map_has_another_school(): void
    {
        $organization = Organization::factory()->create();
        $context = $this->createExamContext($organization);
        $otherContext = $this->createExamContext($organization);
        $otherMap = $this->createMap($otherContext);

        $this->expectException(QueryException::class);
        DB::table('exam_seat_assignments')->insert([
            'id' => fake()->uuid(),
            'organization_id' => $organization->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $otherMap->id,
            'exam_id' => $context['exam']->id,
            'exam_student_id' => $context['examStudent']->id,
            'row_number' => 1,
            'column_number' => 1,
            'seat_number' => 1,
            'is_locked' => false,
            'is_disabled' => false,
        ]);
    }

    #[Test]
    public function assignment_model_rejects_a_student_from_another_exam(): void
    {
        $context = $this->createExamContext();
        $otherExam = Exam::factory()->create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'academic_year_id' => $context['academicYear']->id,
        ]);
        $otherExamClass = $this->createExamClass($context, $otherExam, 'B');
        $otherExamStudent = $this->createExamStudent($context, $otherExam, $otherExamClass);
        $map = $this->createMap($context);

        $this->expectException(DomainException::class);
        $this->createAssignment($context, $map, $otherExamStudent);
    }

    #[Test]
    public function run_model_rejects_a_map_from_another_exam_or_tenant(): void
    {
        $context = $this->createExamContext();
        $otherContext = $this->createExamContext();
        $map = $this->createMap($otherContext);

        $this->expectException(DomainException::class);
        $this->createRun($context, $map, 'mismatched-run');
    }

    #[Test]
    public function color_model_rejects_a_class_from_another_exam(): void
    {
        $context = $this->createExamContext();
        $otherExam = Exam::factory()->create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'academic_year_id' => $context['academicYear']->id,
        ]);
        $otherExamClass = $this->createExamClass($context, $otherExam, 'B');
        $map = $this->createMap($context);

        $this->expectException(DomainException::class);
        ExamSeatingClassColor::create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_class_id' => $otherExamClass->id,
            'color_hex' => '#334455',
        ]);
    }

    #[Test]
    #[DataProvider('crossRecordMismatchProvider')]
    public function database_constraints_reject_cross_record_mismatches(string $recordType): void
    {
        $context = $this->createExamContext();
        $otherExam = Exam::factory()->create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'academic_year_id' => $context['academicYear']->id,
        ]);
        $otherExamClass = $this->createExamClass($context, $otherExam, 'B');
        $otherExamStudent = $this->createExamStudent($context, $otherExam, $otherExamClass);
        $map = $this->createMap($context);

        $this->expectException(QueryException::class);

        if ($recordType === 'assignment') {
            DB::table('exam_seat_assignments')->insert([
                'id' => fake()->uuid(),
                'organization_id' => $context['organization']->id,
                'school_id' => $context['school']->id,
                'exam_seating_map_id' => $map->id,
                'exam_id' => $context['exam']->id,
                'exam_student_id' => $otherExamStudent->id,
                'row_number' => 1,
                'column_number' => 1,
                'seat_number' => 1,
                'is_locked' => false,
                'is_disabled' => false,
            ]);

            return;
        }

        if ($recordType === 'run') {
            DB::table('exam_seating_runs')->insert([
                'id' => fake()->uuid(),
                'organization_id' => $context['organization']->id,
                'school_id' => $context['school']->id,
                'exam_seating_map_id' => $map->id,
                'exam_id' => $otherExam->id,
                'revision' => 1,
                'input_checksum' => str_repeat('c', 64),
                'algorithm_version' => 'v1',
                'idempotency_key' => 'db-mismatched-run',
                'status' => ExamSeatingRun::STATUS_PENDING,
                'conflict_count' => 0,
            ]);

            return;
        }

        DB::table('exam_seating_class_colors')->insert([
            'id' => fake()->uuid(),
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_class_id' => $otherExamClass->id,
            'color_hex' => '#445566',
        ]);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function crossRecordMismatchProvider(): array
    {
        return [
            'assignment student exam mismatch' => ['assignment'],
            'run map exam mismatch' => ['run'],
            'color map class exam mismatch' => ['color'],
        ];
    }

    #[Test]
    #[DataProvider('invalidMapProvider')]
    public function map_checks_reject_invalid_values(array $overrides): void
    {
        $context = $this->createExamContext();

        $this->expectException(QueryException::class);
        ExamSeatingMap::create(array_merge([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_id' => $context['exam']->id,
            'name' => 'Invalid map',
            'rows' => 2,
            'columns' => 2,
        ], $overrides));
    }

    /**
     * @return array<string, array{array<string, int|string>}>
     */
    public static function invalidMapProvider(): array
    {
        return [
            'zero rows' => [['rows' => 0]],
            'zero columns' => [['columns' => 0]],
            'zero start seat' => [['start_seat_number' => 0]],
            'zero revision' => [['revision' => 0]],
            'invalid status' => [['status' => 'invalid']],
            'invalid solver status' => [['solver_status' => 'invalid']],
        ];
    }

    #[Test]
    #[DataProvider('invalidPositionProvider')]
    public function assignment_position_checks_reject_non_positive_values(
        int $row,
        int $column,
        int $seatNumber
    ): void {
        $context = $this->createExamContext();
        $map = $this->createMap($context);

        $this->expectException(QueryException::class);
        $this->createAssignment(
            $context,
            $map,
            $context['examStudent'],
            $row,
            $column,
            $seatNumber
        );
    }

    /**
     * @return array<string, array{int, int, int}>
     */
    public static function invalidPositionProvider(): array
    {
        return [
            'zero row' => [0, 1, 1],
            'zero column' => [1, 0, 1],
            'zero seat number' => [1, 1, 0],
        ];
    }

    #[Test]
    public function class_color_check_rejects_invalid_hex_values(): void
    {
        $context = $this->createExamContext();
        $map = $this->createMap($context);

        $this->expectException(QueryException::class);
        ExamSeatingClassColor::create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_class_id' => $context['examClass']->id,
            'color_hex' => 'not-hex',
        ]);
    }

    #[Test]
    public function active_assignment_check_requires_an_exam_student(): void
    {
        $context = $this->createExamContext();
        $map = $this->createMap($context);

        $this->expectException(QueryException::class);
        DB::table('exam_seat_assignments')->insert([
            'id' => fake()->uuid(),
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $context['exam']->id,
            'exam_student_id' => null,
            'row_number' => 1,
            'column_number' => 1,
            'seat_number' => 1,
            'is_locked' => false,
            'is_disabled' => false,
        ]);
    }

    #[Test]
    #[DataProvider('invalidRunProvider')]
    public function run_checks_reject_invalid_values(array $overrides): void
    {
        $context = $this->createExamContext();
        $map = $this->createMap($context);

        $this->expectException(QueryException::class);
        ExamSeatingRun::create(array_merge([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $context['exam']->id,
            'revision' => 1,
            'input_checksum' => str_repeat('d', 64),
            'algorithm_version' => 'v1',
            'idempotency_key' => 'invalid-run-'.array_key_first($overrides),
        ], $overrides));
    }

    /**
     * @return array<string, array{array<string, int|string>}>
     */
    public static function invalidRunProvider(): array
    {
        return [
            'zero revision' => [['revision' => 0]],
            'invalid status' => [['status' => 'invalid']],
            'negative conflicts' => [['conflict_count' => -1]],
            'invalid checksum' => [['input_checksum' => 'not-a-checksum']],
            'empty algorithm version' => [['algorithm_version' => '']],
            'empty idempotency key' => [['idempotency_key' => '']],
        ];
    }

    #[Test]
    public function run_idempotency_key_is_unique_within_an_organization(): void
    {
        $context = $this->createExamContext();
        $map = $this->createMap($context);
        $this->createRun($context, $map, 'same-attempt');

        $this->expectException(QueryException::class);
        $this->createRun($context, $map, 'same-attempt');
    }

    #[Test]
    public function tenant_scopes_filter_assignments_colors_and_runs(): void
    {
        $context = $this->createExamContext();
        $otherContext = $this->createExamContext();
        $map = $this->createMap($context);
        $otherMap = $this->createMap($otherContext);

        $assignment = $this->createAssignment($context, $map, $context['examStudent']);
        $otherAssignment = $this->createAssignment(
            $otherContext,
            $otherMap,
            $otherContext['examStudent']
        );
        $color = ExamSeatingClassColor::create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_class_id' => $context['examClass']->id,
            'color_hex' => '#123456',
        ]);
        ExamSeatingClassColor::create([
            'organization_id' => $otherContext['organization']->id,
            'school_id' => $otherContext['school']->id,
            'exam_seating_map_id' => $otherMap->id,
            'exam_class_id' => $otherContext['examClass']->id,
            'color_hex' => '#654321',
        ]);
        $run = $this->createRun($context, $map, 'scope-run');
        $this->createRun($otherContext, $otherMap, 'scope-run');

        $this->assertTrue(
            ExamSeatAssignment::query()
                ->forOrganization($context['organization']->id)
                ->forSchool($context['school']->id)
                ->sole()
                ->is($assignment)
        );
        $this->assertFalse(
            ExamSeatAssignment::query()
                ->forOrganization($context['organization']->id)
                ->get()
                ->contains($otherAssignment)
        );
        $this->assertTrue(
            ExamSeatingClassColor::query()
                ->forOrganization($context['organization']->id)
                ->forSchool($context['school']->id)
                ->sole()
                ->is($color)
        );
        $this->assertTrue(
            ExamSeatingRun::query()
                ->forOrganization($context['organization']->id)
                ->forSchool($context['school']->id)
                ->sole()
                ->is($run)
        );
    }

    #[Test]
    public function school_scopes_isolate_all_seating_models_within_one_organization(): void
    {
        $organization = Organization::factory()->create();
        $context = $this->createExamContext($organization);
        $otherContext = $this->createExamContext($organization);
        $map = $this->createMap($context);
        $otherMap = $this->createMap($otherContext);
        $assignment = $this->createAssignment($context, $map, $context['examStudent']);
        $this->createAssignment($otherContext, $otherMap, $otherContext['examStudent']);
        $color = ExamSeatingClassColor::create([
            'organization_id' => $organization->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_class_id' => $context['examClass']->id,
            'color_hex' => '#123456',
        ]);
        ExamSeatingClassColor::create([
            'organization_id' => $organization->id,
            'school_id' => $otherContext['school']->id,
            'exam_seating_map_id' => $otherMap->id,
            'exam_class_id' => $otherContext['examClass']->id,
            'color_hex' => '#654321',
        ]);
        $run = $this->createRun($context, $map, 'school-one-run');
        $this->createRun($otherContext, $otherMap, 'school-two-run');

        $this->assertTrue(
            ExamSeatingMap::query()
                ->forOrganization($organization->id)
                ->forSchool($context['school']->id)
                ->sole()
                ->is($map)
        );
        $this->assertTrue(
            ExamSeatAssignment::query()
                ->forOrganization($organization->id)
                ->forSchool($context['school']->id)
                ->sole()
                ->is($assignment)
        );
        $this->assertTrue(
            ExamSeatingClassColor::query()
                ->forOrganization($organization->id)
                ->forSchool($context['school']->id)
                ->sole()
                ->is($color)
        );
        $this->assertTrue(
            ExamSeatingRun::query()
                ->forOrganization($organization->id)
                ->forSchool($context['school']->id)
                ->sole()
                ->is($run)
        );
    }

    #[Test]
    public function seating_tables_enable_rls_with_one_org_policy_each(): void
    {
        $tables = [
            'exam_seating_maps' => 'Org isolation seating maps',
            'exam_seat_assignments' => 'Org isolation seat assignments',
            'exam_seating_class_colors' => 'Org isolation seating colors',
            'exam_seating_runs' => 'Org isolation seating runs',
        ];

        foreach ($tables as $table => $policyName) {
            $rlsEnabled = DB::table('pg_class')
                ->where('relname', $table)
                ->value('relrowsecurity');
            $policies = DB::table('pg_policies')
                ->where('schemaname', 'public')
                ->where('tablename', $table)
                ->get();

            $this->assertTrue((bool) $rlsEnabled, "{$table} must have RLS enabled.");
            $this->assertCount(1, $policies);
            $this->assertSame($policyName, $policies->sole()->policyname);
            $this->assertSame('ALL', $policies->sole()->cmd);
            $this->assertLessThan(63, strlen($policies->sole()->policyname));
            $this->assertStringContainsString(
                'app.current_organization_id',
                $policies->sole()->qual
            );
            $this->assertStringContainsString('organization_id', $policies->sole()->qual);
            $this->assertStringContainsString(
                'app.current_organization_id',
                $policies->sole()->with_check
            );
        }
    }

    #[Test]
    public function seating_trigger_functions_use_a_secure_search_path(): void
    {
        $functions = [
            'validate_exam_seating_class_color_exam',
            'reject_exam_seating_run_mutation',
        ];

        foreach ($functions as $function) {
            $configuration = DB::table('pg_proc')
                ->where('proname', $function)
                ->value('proconfig');

            $this->assertNotNull($configuration);
            $this->assertStringContainsString('search_path=public', (string) $configuration);
        }
    }

    /**
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     academicYear: AcademicYear,
     *     exam: Exam,
     *     examClass: ExamClass,
     *     examStudent: ExamStudent
     * }
     */
    private function createExamContext(?Organization $organization = null): array
    {
        $organization ??= Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $exam = Exam::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
        ]);
        $context = compact('organization', 'school', 'academicYear', 'exam');
        $examClass = $this->createExamClass($context, $exam, 'A');
        $context['examClass'] = $examClass;
        $context['examStudent'] = $this->createExamStudent($context, $exam, $examClass);

        return $context;
    }

    private function createExamClass(array $context, Exam $exam, string $section): ExamClass
    {
        $class = ClassModel::factory()->create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
        ]);
        $classAcademicYear = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $context['academicYear']->id,
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'section_name' => $section,
        ]);

        return ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
        ]);
    }

    private function createExamStudent(
        array $context,
        Exam $exam,
        ExamClass $examClass
    ): ExamStudent {
        $student = Student::factory()->create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
        ]);
        $admission = StudentAdmission::create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'student_id' => $student->id,
            'academic_year_id' => $context['academicYear']->id,
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
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
        ]);
    }

    private function createMap(array $context): ExamSeatingMap
    {
        return ExamSeatingMap::create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_id' => $context['exam']->id,
            'name' => 'Integrity map',
            'rows' => 3,
            'columns' => 3,
        ]);
    }

    private function createRoom(array $context): Room
    {
        $building = Building::create([
            'building_name' => 'Building '.fake()->unique()->numerify('###'),
            'school_id' => $context['school']->id,
        ]);

        return Room::create([
            'room_number' => fake()->unique()->numerify('Room ###'),
            'building_id' => $building->id,
            'school_id' => $context['school']->id,
        ]);
    }

    private function createAssignment(
        array $context,
        ExamSeatingMap $map,
        ExamStudent $examStudent,
        int $row = 1,
        int $column = 1,
        int $seatNumber = 1
    ): ExamSeatAssignment {
        return ExamSeatAssignment::create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $context['exam']->id,
            'exam_student_id' => $examStudent->id,
            'row_number' => $row,
            'column_number' => $column,
            'seat_number' => $seatNumber,
        ]);
    }

    private function createRun(
        array $context,
        ExamSeatingMap $map,
        string $idempotencyKey
    ): ExamSeatingRun {
        return ExamSeatingRun::create([
            'organization_id' => $context['organization']->id,
            'school_id' => $context['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $context['exam']->id,
            'revision' => 1,
            'input_checksum' => str_repeat('a', 64),
            'algorithm_version' => 'v1',
            'idempotency_key' => $idempotencyKey,
        ]);
    }
}
