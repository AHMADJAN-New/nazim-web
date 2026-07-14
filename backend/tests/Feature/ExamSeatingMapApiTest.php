<?php

namespace Tests\Feature;

use App\Jobs\RunExamSeatingSolverJob;
use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSeatAssignment;
use App\Models\ExamSeatingMap;
use App\Models\ExamStudent;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use App\Services\ExamSeating\ExamSeatingSolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ExamSeatingMapApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permissions
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     exam: Exam,
     *     examClass: ExamClass,
     *     examStudent: ExamStudent,
     *     user: \App\Models\User
     * }
     */
    private function createFixture(array $permissions = []): array
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
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        $exam = Exam::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'status' => Exam::STATUS_DRAFT,
        ]);

        $examClass = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Ahmad Test',
        ]);

        $admission = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        $examStudent = ExamStudent::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'student_admission_id' => $admission->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

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

        foreach ($permissions as $permissionName) {
            $permission = Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web',
                'organization_id' => $organization->id,
            ], [
                'resource' => explode('.', $permissionName)[0],
                'action' => explode('.', $permissionName)[1] ?? 'read',
            ]);

            $user->givePermissionTo($permission);
        }

        setPermissionsTeamId(null);

        return compact('organization', 'school', 'exam', 'examClass', 'examStudent', 'user');
    }

    /** @test */
    public function it_requires_permission_to_list_seating_maps(): void
    {
        $fixture = $this->createFixture();

        $response = $this->jsonAs($fixture['user'], 'GET', "/api/exams/{$fixture['exam']->id}/seating-maps");

        $response->assertStatus(403);
    }

    /** @test */
    public function it_creates_lists_and_shows_seating_maps(): void
    {
        $fixture = $this->createFixture([
            'exam_seating_maps.read',
            'exam_seating_maps.create',
        ]);

        $create = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Hall A',
            'rows' => 2,
            'columns' => 2,
            'start_seat_number' => 1,
            'exam_class_ids' => [$fixture['examClass']->id],
        ]);

        $create->assertCreated()
            ->assertJsonPath('name', 'Hall A')
            ->assertJsonPath('rows', 2)
            ->assertJsonPath('columns', 2)
            ->assertJsonCount(4, 'assignments');

        $mapId = $create->json('id');

        $this->jsonAs($fixture['user'], 'GET', "/api/exams/{$fixture['exam']->id}/seating-maps")
            ->assertOk()
            ->assertJsonCount(1);

        $this->jsonAs($fixture['user'], 'GET', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapId}")
            ->assertOk()
            ->assertJsonPath('id', $mapId);
    }

    /** @test */
    public function it_numbers_seats_column_major_top_to_bottom(): void
    {
        $fixture = $this->createFixture([
            'exam_seating_maps.read',
            'exam_seating_maps.create',
        ]);

        $create = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Hall A',
            'rows' => 2,
            'columns' => 3,
            'start_seat_number' => 10,
            'exam_class_ids' => [$fixture['examClass']->id],
        ])->assertCreated();

        $assignments = collect($create->json('assignments'))
            ->keyBy(fn (array $assignment): string => "{$assignment['row_number']}:{$assignment['column_number']}");

        // Column 1: 10, 11 — Column 2: 12, 13 — Column 3: 14, 15
        $this->assertSame(10, $assignments->get('1:1')['seat_number']);
        $this->assertSame(11, $assignments->get('2:1')['seat_number']);
        $this->assertSame(12, $assignments->get('1:2')['seat_number']);
        $this->assertSame(13, $assignments->get('2:2')['seat_number']);
        $this->assertSame(14, $assignments->get('1:3')['seat_number']);
        $this->assertSame(15, $assignments->get('2:3')['seat_number']);
    }

    /** @test */
    public function it_returns_unassigned_exam_students_on_map_detail(): void
    {
        $fixture = $this->createFixture([
            'exam_seating_maps.read',
            'exam_seating_maps.create',
        ]);

        $create = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Hall A',
            'rows' => 2,
            'columns' => 2,
            'start_seat_number' => 1,
            'exam_class_ids' => [$fixture['examClass']->id],
        ])->assertCreated();

        $mapId = $create->json('id');

        $this->jsonAs($fixture['user'], 'GET', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapId}")
            ->assertOk()
            ->assertJsonCount(1, 'unassigned_students')
            ->assertJsonPath('unassigned_students.0.exam_student_id', $fixture['examStudent']->id)
            ->assertJsonPath('unassigned_students.0.full_name', 'Ahmad Test');
    }

    /** @test */
    public function it_persists_enabled_empty_seats_without_exam_student_id(): void
    {
        $fixture = $this->createFixture([
            'exam_seating_maps.read',
            'exam_seating_maps.create',
            'exam_seating_maps.assign',
        ]);

        $create = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Hall A',
            'rows' => 1,
            'columns' => 1,
            'start_seat_number' => 1,
            'exam_class_ids' => [$fixture['examClass']->id],
        ])->assertCreated();

        $mapId = $create->json('id');
        $revision = $create->json('revision');

        $this->jsonAs($fixture['user'], 'PUT', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapId}/assignments", [
            'revision' => $revision,
            'assignments' => [[
                'row_number' => 1,
                'column_number' => 1,
                'exam_student_id' => null,
                'is_disabled' => false,
            ]],
        ])
            ->assertOk()
            ->assertJsonPath('assignments.0.is_disabled', false)
            ->assertJsonPath('assignments.0.exam_student_id', null);
    }

    /** @test */
    public function it_rejects_overlapping_seat_ranges_for_the_same_exam(): void
    {
        $fixture = $this->createFixture([
            'exam_seating_maps.create',
        ]);

        $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Hall A',
            'rows' => 2,
            'columns' => 2,
            'start_seat_number' => 1,
            'exam_class_ids' => [$fixture['examClass']->id],
        ])->assertCreated();

        $overlap = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Hall B',
            'rows' => 2,
            'columns' => 2,
            'start_seat_number' => 3,
            'exam_class_ids' => [$fixture['examClass']->id],
        ]);

        $overlap->assertStatus(409)
            ->assertJsonFragment(['error' => 'Seat range 3-6 overlaps map "Hall A" (1-4)']);
    }

    /** @test */
    public function it_enforces_tenant_isolation_for_seating_maps(): void
    {
        $fixture = $this->createFixture(['exam_seating_maps.read', 'exam_seating_maps.create']);
        $other = $this->createFixture(['exam_seating_maps.read']);

        $map = ExamSeatingMap::create([
            'organization_id' => $other['organization']->id,
            'school_id' => $other['school']->id,
            'exam_id' => $other['exam']->id,
            'name' => 'Other org map',
            'rows' => 2,
            'columns' => 2,
        ]);

        $this->jsonAs($fixture['user'], 'GET', "/api/exams/{$other['exam']->id}/seating-maps/{$map->id}")
            ->assertNotFound();
    }

    /** @test */
    public function it_dispatches_solver_job_and_returns_solve_status(): void
    {
        Queue::fake();

        $fixture = $this->createFixture([
            'exam_seating_maps.read',
            'exam_seating_maps.create',
            'exam_seating_maps.assign',
        ]);

        $create = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Solver map',
            'rows' => 2,
            'columns' => 2,
            'start_seat_number' => 1,
            'exam_class_ids' => [$fixture['examClass']->id],
        ])->assertCreated();

        $mapId = $create->json('id');
        $revision = $create->json('revision');
        $checksum = $create->json('input_checksum');

        $solve = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapId}/solve", [
            'revision' => $revision,
            'input_checksum' => $checksum,
            'strict_mode' => true,
        ]);

        $solve->assertAccepted()
            ->assertJsonPath('solver_status', ExamSeatingMap::SOLVER_PENDING);

        Queue::assertPushed(RunExamSeatingSolverJob::class);

        $this->jsonAs($fixture['user'], 'GET', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapId}/solve-status")
            ->assertOk()
            ->assertJsonPath('solver_status', ExamSeatingMap::SOLVER_PENDING);
    }

    /** @test */
    public function it_dispatches_solver_job_with_zigzag_strategy(): void
    {
        Queue::fake();

        $fixture = $this->createFixture([
            'exam_seating_maps.read',
            'exam_seating_maps.create',
            'exam_seating_maps.assign',
        ]);

        $create = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Zigzag solver map',
            'rows' => 2,
            'columns' => 2,
            'start_seat_number' => 1,
            'exam_class_ids' => [$fixture['examClass']->id],
        ])->assertCreated();

        $mapId = $create->json('id');

        $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapId}/solve", [
            'revision' => $create->json('revision'),
            'input_checksum' => $create->json('input_checksum'),
            'strict_mode' => true,
            'strategy' => 'zigzag',
        ])->assertAccepted();

        Queue::assertPushed(RunExamSeatingSolverJob::class, function (RunExamSeatingSolverJob $job) {
            return $job->strategy === 'zigzag';
        });
    }

    /** @test */
    public function solver_job_applies_results_when_mocked_solver_succeeds(): void
    {
        $fixture = $this->createFixture();
        $map = ExamSeatingMap::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'name' => 'Job map',
            'rows' => 1,
            'columns' => 1,
            'start_seat_number' => 1,
        ]);

        \App\Models\ExamSeatingMapClass::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_class_id' => $fixture['examClass']->id,
        ]);

        ExamSeatAssignment::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $fixture['exam']->id,
            'row_number' => 1,
            'column_number' => 1,
            'seat_number' => 1,
            'is_disabled' => false,
            'exam_student_id' => null,
        ]);

        $map->refresh();
        $solverService = app(ExamSeatingSolverService::class);
        $built = $solverService->buildSolverInput($map);
        $map->input_checksum = $built['checksum'];
        $map->save();

        $this->mock(ExamSeatingSolverService::class, function ($mock) use ($fixture, $built): void {
            $mock->shouldReceive('buildSolverInput')->andReturn($built);
            $mock->shouldReceive('solve')->andReturn([
                'checksum' => $built['checksum'],
                'seed' => 42,
                'result' => [
                    'contract_version' => '1.0',
                    'status' => 'optimal',
                    'assignments' => [[
                        'exam_student_id' => $fixture['examStudent']->id,
                        'exam_class_id' => $fixture['examClass']->id,
                        'row' => 0,
                        'col' => 0,
                        'seat_number' => 1,
                    ]],
                    'conflict_pairs' => [],
                    'conflicts_count' => 0,
                    'mode_used' => 'strict',
                ],
            ]);
        });

        $job = new RunExamSeatingSolverJob(
            $map->id,
            $map->revision,
            $built['checksum'],
            true,
            42,
            $fixture['user']->id,
            'test-idempotency-key'
        );

        $job->handle(app(ExamSeatingSolverService::class), app(\App\Services\ExamSeating\ExamSeatingMapService::class));

        $map->refresh();
        $assignment = ExamSeatAssignment::query()->where('exam_seating_map_id', $map->id)->first();

        $this->assertSame(ExamSeatingMap::SOLVER_SUCCEEDED, $map->solver_status);
        $this->assertSame(ExamSeatingMap::STATUS_GENERATED, $map->status);
        $this->assertSame($fixture['examStudent']->id, $assignment->exam_student_id);
        $this->assertFalse($assignment->is_disabled);
    }

    /** @test */
    public function it_rejects_updates_after_finalize(): void
    {
        $fixture = $this->createFixture([
            'exam_seating_maps.read',
            'exam_seating_maps.create',
            'exam_seating_maps.update',
        ]);

        $create = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Finalize map',
            'rows' => 2,
            'columns' => 2,
            'exam_class_ids' => [$fixture['examClass']->id],
        ])->assertCreated();

        $mapId = $create->json('id');

        $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapId}/finalize")
            ->assertOk()
            ->assertJsonPath('status', ExamSeatingMap::STATUS_FINALIZED);

        $this->jsonAs($fixture['user'], 'PUT', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapId}", [
            'name' => 'Renamed',
        ])->assertStatus(409);
    }

    /** @test */
    public function it_previews_and_confirms_continuous_roll_numbers_from_seating_map(): void
    {
        $fixture = $this->createFixture([
            'exam_seating_maps.create',
            'exams.roll_numbers.assign',
        ]);

        $map = ExamSeatingMap::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'name' => 'Roll map',
            'rows' => 1,
            'columns' => 2,
            'start_seat_number' => 10,
        ]);

        ExamSeatAssignment::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $fixture['exam']->id,
            'exam_student_id' => $fixture['examStudent']->id,
            'row_number' => 1,
            'column_number' => 1,
            'seat_number' => 10,
            'is_disabled' => false,
            'is_locked' => true,
        ]);

        $baseAdmission = $fixture['examStudent']->studentAdmission;
        $this->assertNotNull($baseAdmission);

        $secondStudent = Student::factory()->create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'full_name' => 'Second Student',
        ]);
        $secondAdmission = StudentAdmission::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'student_id' => $secondStudent->id,
            'academic_year_id' => $baseAdmission->academic_year_id,
            'class_id' => $baseAdmission->class_id,
            'class_academic_year_id' => $baseAdmission->class_academic_year_id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);
        $secondExamStudent = ExamStudent::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'student_admission_id' => $secondAdmission->id,
        ]);

        ExamSeatAssignment::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $fixture['exam']->id,
            'exam_student_id' => $secondExamStudent->id,
            'row_number' => 1,
            'column_number' => 2,
            'seat_number' => 20,
            'is_disabled' => false,
            'is_locked' => true,
        ]);

        // Existing roll on another student outside this map should push start to 6.
        $outsideStudent = Student::factory()->create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'full_name' => 'Outside Student',
        ]);
        $outsideAdmission = StudentAdmission::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'student_id' => $outsideStudent->id,
            'academic_year_id' => $baseAdmission->academic_year_id,
            'class_id' => $baseAdmission->class_id,
            'class_academic_year_id' => $baseAdmission->class_academic_year_id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);
        $outsideExamStudent = ExamStudent::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'student_admission_id' => $outsideAdmission->id,
            'exam_roll_number' => '5',
        ]);

        $solverService = app(ExamSeatingSolverService::class);
        $map->input_checksum = $solverService->buildSolverInput($map->fresh(['assignments']))['checksum'];
        $map->save();

        $preview = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$map->id}/roll-numbers/preview");
        $preview->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('start_roll', 6)
            ->assertJsonPath('items.0.seat_number', 10)
            ->assertJsonPath('items.0.new_roll_number', '6')
            ->assertJsonPath('items.1.seat_number', 20)
            ->assertJsonPath('items.1.new_roll_number', '7');

        $confirm = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$map->id}/roll-numbers/confirm", [
            'revision' => $preview->json('revision'),
            'input_checksum' => $preview->json('input_checksum'),
        ]);

        $confirm->assertOk()
            ->assertJsonPath('updated', 2)
            ->assertJsonPath('map.status', ExamSeatingMap::STATUS_APPLIED);

        $fixture['examStudent']->refresh();
        $secondExamStudent->refresh();
        $outsideExamStudent->refresh();
        $this->assertSame('6', $fixture['examStudent']->exam_roll_number);
        $this->assertSame('7', $secondExamStudent->exam_roll_number);
        $this->assertSame('5', $outsideExamStudent->exam_roll_number);
    }

    /** @test */
    public function it_applies_roll_numbers_to_second_map_after_first_without_stale_checksum(): void
    {
        $fixture = $this->createFixture([
            'exam_seating_maps.create',
            'exams.roll_numbers.assign',
        ]);

        $mapA = ExamSeatingMap::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'name' => 'Hall A',
            'rows' => 1,
            'columns' => 1,
            'start_seat_number' => 1,
        ]);
        \App\Models\ExamSeatingMapClass::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_seating_map_id' => $mapA->id,
            'exam_class_id' => $fixture['examClass']->id,
        ]);
        ExamSeatAssignment::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_seating_map_id' => $mapA->id,
            'exam_id' => $fixture['exam']->id,
            'exam_student_id' => $fixture['examStudent']->id,
            'row_number' => 1,
            'column_number' => 1,
            'seat_number' => 1,
            'is_disabled' => false,
            'is_locked' => true,
        ]);

        $baseAdmission = $fixture['examStudent']->studentAdmission;
        $this->assertNotNull($baseAdmission);

        $secondStudent = Student::factory()->create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'full_name' => 'Second Student',
        ]);
        $secondAdmission = StudentAdmission::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'student_id' => $secondStudent->id,
            'academic_year_id' => $baseAdmission->academic_year_id,
            'class_id' => $baseAdmission->class_id,
            'class_academic_year_id' => $baseAdmission->class_academic_year_id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);
        $secondExamStudent = ExamStudent::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'student_admission_id' => $secondAdmission->id,
        ]);

        $mapB = ExamSeatingMap::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'name' => 'Hall B',
            'rows' => 1,
            'columns' => 1,
            'start_seat_number' => 100,
        ]);
        \App\Models\ExamSeatingMapClass::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_seating_map_id' => $mapB->id,
            'exam_class_id' => $fixture['examClass']->id,
        ]);
        ExamSeatAssignment::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_seating_map_id' => $mapB->id,
            'exam_id' => $fixture['exam']->id,
            'exam_student_id' => $secondExamStudent->id,
            'row_number' => 1,
            'column_number' => 1,
            'seat_number' => 100,
            'is_disabled' => false,
            'is_locked' => true,
        ]);

        $mapService = app(\App\Services\ExamSeating\ExamSeatingMapService::class);
        $solverService = app(ExamSeatingSolverService::class);

        $seatChecksumBefore = $mapService->buildSeatAssignmentsChecksum($mapB->fresh(['assignments']));
        $solverChecksumBefore = $solverService->buildSolverInput($mapB->fresh(['assignments']))['checksum'];

        $previewA = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapA->id}/roll-numbers/preview");
        $previewA->assertOk();
        $confirmA = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapA->id}/roll-numbers/confirm", [
            'revision' => $previewA->json('revision'),
            'input_checksum' => $previewA->json('input_checksum'),
        ]);
        $confirmA->assertOk()->assertJsonPath('updated', 1);

        // Applying map A changes B's solver checksum (student locked elsewhere),
        // but seat-layout checksum for B stays the same.
        $this->assertNotSame(
            $solverChecksumBefore,
            $solverService->buildSolverInput($mapB->fresh(['assignments']))['checksum']
        );
        $this->assertSame(
            $seatChecksumBefore,
            $mapService->buildSeatAssignmentsChecksum($mapB->fresh(['assignments']))
        );

        // Old client sending solver checksum must fail against seat-layout validation.
        $staleConfirm = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapB->id}/roll-numbers/confirm", [
            'revision' => $mapB->revision,
            'input_checksum' => $solverChecksumBefore,
        ]);
        $staleConfirm->assertStatus(409);

        $previewB = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapB->id}/roll-numbers/preview");
        $previewB->assertOk()->assertJsonPath('total', 1);
        $this->assertSame($seatChecksumBefore, $previewB->json('input_checksum'));

        $confirmB = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$mapB->id}/roll-numbers/confirm", [
            'revision' => $previewB->json('revision'),
            'input_checksum' => $previewB->json('input_checksum'),
        ]);
        $confirmB->assertOk()->assertJsonPath('updated', 1);

        $fixture['examStudent']->refresh();
        $secondExamStudent->refresh();
        $this->assertSame('1', $fixture['examStudent']->exam_roll_number);
        $this->assertSame('2', $secondExamStudent->exam_roll_number);
    }
}
