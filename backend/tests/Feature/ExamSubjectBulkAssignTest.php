<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\ClassSubject;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSubject;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ExamSubjectBulkAssignTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     exam: Exam,
     *     examClass: ExamClass,
     *     classSubjectA: ClassSubject,
     *     classSubjectB: ClassSubject,
     *     user: \App\Models\User
     * }
     */
    private function createFixture(bool $preAssignOne = false): array
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

        if ($preAssignOne) {
            ExamSubject::create([
                'exam_id' => $exam->id,
                'exam_class_id' => $examClass->id,
                'class_subject_id' => $classSubjectA->id,
                'subject_id' => $subjectA->id,
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'total_marks' => 50,
                'passing_marks' => 20,
            ]);
        }

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
            'name' => 'exams.assign',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ], [
            'resource' => 'exams',
            'action' => 'assign',
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return compact(
            'organization',
            'school',
            'exam',
            'examClass',
            'classSubjectA',
            'classSubjectB',
            'user'
        );
    }

    /** @test */
    public function bulk_assign_all_assigns_missing_subjects_with_marks(): void
    {
        $fixture = $this->createFixture(preAssignOne: true);

        $response = $this->jsonAs(
            $fixture['user'],
            'POST',
            '/api/exam-subjects/bulk-assign-all',
            [
                'exam_id' => $fixture['exam']->id,
                'total_marks' => 100,
                'passing_marks' => 40,
            ]
        );

        $response->assertCreated()
            ->assertJsonPath('assigned_count', 1)
            ->assertJsonPath('skipped_count', 1);

        $this->assertDatabaseHas('exam_subjects', [
            'exam_id' => $fixture['exam']->id,
            'class_subject_id' => $fixture['classSubjectB']->id,
            'total_marks' => 100,
            'passing_marks' => 40,
        ]);
    }

    /** @test */
    public function bulk_update_marks_updates_all_subjects(): void
    {
        $fixture = $this->createFixture(preAssignOne: true);

        ExamSubject::create([
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'class_subject_id' => $fixture['classSubjectB']->id,
            'subject_id' => $fixture['classSubjectB']->subject_id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
        ]);

        $response = $this->jsonAs(
            $fixture['user'],
            'POST',
            '/api/exam-subjects/bulk-update-marks',
            [
                'exam_id' => $fixture['exam']->id,
                'total_marks' => 80,
                'passing_marks' => 32,
            ]
        );

        $response->assertOk()
            ->assertJsonPath('updated_count', 2);

        $this->assertDatabaseHas('exam_subjects', [
            'exam_id' => $fixture['exam']->id,
            'class_subject_id' => $fixture['classSubjectA']->id,
            'total_marks' => 80,
            'passing_marks' => 32,
        ]);

        $this->assertDatabaseHas('exam_subjects', [
            'exam_id' => $fixture['exam']->id,
            'class_subject_id' => $fixture['classSubjectB']->id,
            'total_marks' => 80,
            'passing_marks' => 32,
        ]);
    }

    /** @test */
    public function bulk_update_marks_only_unset_skips_configured_subjects(): void
    {
        $fixture = $this->createFixture(preAssignOne: true);

        ExamSubject::create([
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'class_subject_id' => $fixture['classSubjectB']->id,
            'subject_id' => $fixture['classSubjectB']->subject_id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
        ]);

        $response = $this->jsonAs(
            $fixture['user'],
            'POST',
            '/api/exam-subjects/bulk-update-marks',
            [
                'exam_id' => $fixture['exam']->id,
                'total_marks' => 90,
                'passing_marks' => 45,
                'only_unset' => true,
            ]
        );

        $response->assertOk()
            ->assertJsonPath('updated_count', 1);

        $this->assertDatabaseHas('exam_subjects', [
            'exam_id' => $fixture['exam']->id,
            'class_subject_id' => $fixture['classSubjectA']->id,
            'total_marks' => 50,
            'passing_marks' => 20,
        ]);

        $this->assertDatabaseHas('exam_subjects', [
            'exam_id' => $fixture['exam']->id,
            'class_subject_id' => $fixture['classSubjectB']->id,
            'total_marks' => 90,
            'passing_marks' => 45,
        ]);
    }
}
