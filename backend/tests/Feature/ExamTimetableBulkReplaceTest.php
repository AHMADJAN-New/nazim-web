<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\ClassSubject;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSubject;
use App\Models\ExamTime;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ExamTimetableBulkReplaceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     exam: Exam,
     *     examClass: ExamClass,
     *     examSubjectA: ExamSubject,
     *     examSubjectB: ExamSubject,
     *     user: \App\Models\User
     * }
     */
    private function createFixture(): array
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
            'start_date' => now()->addDays(1)->toDateString(),
            'end_date' => now()->addDays(14)->toDateString(),
            'status' => Exam::STATUS_DRAFT,
        ]);

        $examClass = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $subjectA = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Math',
            'code' => 'MATH',
            'is_active' => true,
        ]);

        $subjectB = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'English',
            'code' => 'ENG',
            'is_active' => true,
        ]);

        $classSubjectA = ClassSubject::create([
            'class_academic_year_id' => $classAcademicYear->id,
            'subject_id' => $subjectA->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
        ]);

        $classSubjectB = ClassSubject::create([
            'class_academic_year_id' => $classAcademicYear->id,
            'subject_id' => $subjectB->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
        ]);

        $examSubjectA = ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'class_subject_id' => $classSubjectA->id,
            'subject_id' => $subjectA->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $examSubjectB = ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'class_subject_id' => $classSubjectB->id,
            'subject_id' => $subjectB->id,
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
        $permission = Permission::firstOrCreate([
            'name' => 'exams.manage_timetable',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ], [
            'resource' => 'exams',
            'action' => 'manage_timetable',
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return compact(
            'organization',
            'school',
            'exam',
            'examClass',
            'examSubjectA',
            'examSubjectB',
            'user'
        );
    }

    /** @test */
    public function bulk_replace_creates_slots_and_deletes_unlocked_only(): void
    {
        $fixture = $this->createFixture();
        $dateA = now()->addDays(2)->toDateString();
        $dateB = now()->addDays(3)->toDateString();
        $dateLocked = now()->addDays(4)->toDateString();

        $unlocked = ExamTime::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'exam_subject_id' => $fixture['examSubjectA']->id,
            'date' => $dateA,
            'start_time' => '08:00',
            'end_time' => '11:00',
            'is_locked' => false,
        ]);

        $locked = ExamTime::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'exam_subject_id' => $fixture['examSubjectB']->id,
            'date' => $dateLocked,
            'start_time' => '08:00',
            'end_time' => '11:00',
            'is_locked' => true,
        ]);

        // Replace unlocked with a new slot for subject A on a different day
        $response = $this->jsonAs(
            $fixture['user'],
            'POST',
            "/api/exams/{$fixture['exam']->id}/times/bulk-replace",
            [
                'times' => [
                    [
                        'exam_class_id' => $fixture['examClass']->id,
                        'exam_subject_id' => $fixture['examSubjectA']->id,
                        'date' => $dateB,
                        'start_time' => '09:00',
                        'end_time' => '12:00',
                    ],
                ],
            ]
        );

        $response->assertStatus(200)
            ->assertJsonPath('created_count', 1);

        $this->assertSoftDeleted('exam_times', ['id' => $unlocked->id]);
        $this->assertDatabaseHas('exam_times', [
            'id' => $locked->id,
            'is_locked' => true,
            'deleted_at' => null,
        ]);
        $this->assertDatabaseHas('exam_times', [
            'exam_subject_id' => $fixture['examSubjectA']->id,
            'date' => $dateB,
            'start_time' => '09:00:00',
            'is_locked' => false,
            'deleted_at' => null,
        ]);
    }

    /** @test */
    public function bulk_replace_rejects_conflict_with_locked_class_day(): void
    {
        $fixture = $this->createFixture();
        $dateLocked = now()->addDays(4)->toDateString();

        ExamTime::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'exam_subject_id' => $fixture['examSubjectB']->id,
            'date' => $dateLocked,
            'start_time' => '08:00',
            'end_time' => '11:00',
            'is_locked' => true,
        ]);

        $response = $this->jsonAs(
            $fixture['user'],
            'POST',
            "/api/exams/{$fixture['exam']->id}/times/bulk-replace",
            [
                'times' => [
                    [
                        'exam_class_id' => $fixture['examClass']->id,
                        'exam_subject_id' => $fixture['examSubjectA']->id,
                        'date' => $dateLocked,
                        'start_time' => '09:00',
                        'end_time' => '12:00',
                    ],
                ],
            ]
        );

        $response->assertStatus(422);
        $this->assertStringContainsString('locked', strtolower($response->json('error') ?? ''));
    }

    /** @test */
    public function bulk_replace_syncs_exam_subject_scheduled_at_for_exam_report(): void
    {
        $fixture = $this->createFixture();
        $dateA = now()->addDays(2)->toDateString();
        $dateB = now()->addDays(3)->toDateString();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $viewReportsPermission = Permission::firstOrCreate([
            'name' => 'exams.view_reports',
            'guard_name' => 'web',
            'organization_id' => $fixture['organization']->id,
        ], [
            'resource' => 'exams',
            'action' => 'view_reports',
        ]);

        setPermissionsTeamId($fixture['organization']->id);
        $fixture['user']->givePermissionTo($viewReportsPermission);
        setPermissionsTeamId(null);

        $this->jsonAs(
            $fixture['user'],
            'POST',
            "/api/exams/{$fixture['exam']->id}/times/bulk-replace",
            [
                'times' => [
                    [
                        'exam_class_id' => $fixture['examClass']->id,
                        'exam_subject_id' => $fixture['examSubjectA']->id,
                        'date' => $dateA,
                        'start_time' => '09:00',
                        'end_time' => '12:00',
                    ],
                    [
                        'exam_class_id' => $fixture['examClass']->id,
                        'exam_subject_id' => $fixture['examSubjectB']->id,
                        'date' => $dateB,
                        'start_time' => '13:00',
                        'end_time' => '16:00',
                    ],
                ],
            ]
        )->assertStatus(200);

        $fixture['examSubjectA']->refresh();
        $fixture['examSubjectB']->refresh();

        $this->assertNotNull($fixture['examSubjectA']->scheduled_at);
        $this->assertNotNull($fixture['examSubjectB']->scheduled_at);
        $this->assertSame($dateA, $fixture['examSubjectA']->scheduled_at->format('Y-m-d'));
        $this->assertSame($dateB, $fixture['examSubjectB']->scheduled_at->format('Y-m-d'));

        $report = $this->jsonAs(
            $fixture['user'],
            'GET',
            "/api/exams/{$fixture['exam']->id}/report"
        );

        $report->assertStatus(200);

        $subjects = collect($report->json('classes.0.subjects'));
        $subjectA = $subjects->firstWhere('id', $fixture['examSubjectA']->id);
        $subjectB = $subjects->firstWhere('id', $fixture['examSubjectB']->id);

        $this->assertNotNull($subjectA['scheduled_at'] ?? null);
        $this->assertNotNull($subjectB['scheduled_at'] ?? null);
        $this->assertStringStartsWith($dateA, $subjectA['scheduled_at']);
        $this->assertStringStartsWith($dateB, $subjectB['scheduled_at']);
    }
}
