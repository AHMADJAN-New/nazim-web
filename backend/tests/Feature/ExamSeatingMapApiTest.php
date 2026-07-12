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
        ])->assertCreated();

        $overlap = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps", [
            'name' => 'Hall B',
            'rows' => 2,
            'columns' => 2,
            'start_seat_number' => 3,
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

        ExamSeatAssignment::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_seating_map_id' => $map->id,
            'exam_id' => $fixture['exam']->id,
            'row_number' => 1,
            'column_number' => 1,
            'seat_number' => 1,
            'is_disabled' => true,
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
    public function it_previews_and_confirms_roll_numbers_from_seating_map(): void
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
            'columns' => 1,
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

        $solverService = app(ExamSeatingSolverService::class);
        $map->input_checksum = $solverService->buildSolverInput($map->fresh(['assignments']))['checksum'];
        $map->save();

        $preview = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$map->id}/roll-numbers/preview");
        $preview->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('items.0.new_roll_number', '10')
            ->assertJsonPath('items.0.seat_number', 10);

        $confirm = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/seating-maps/{$map->id}/roll-numbers/confirm", [
            'revision' => $map->revision,
            'input_checksum' => $map->input_checksum,
        ]);

        $confirm->assertOk()
            ->assertJsonPath('updated', 1)
            ->assertJsonPath('map.status', ExamSeatingMap::STATUS_APPLIED);

        $fixture['examStudent']->refresh();
        $this->assertSame('10', $fixture['examStudent']->exam_roll_number);
    }
}
