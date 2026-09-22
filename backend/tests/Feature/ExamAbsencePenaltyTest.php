<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\ClassSubject;
use App\Models\Exam;
use App\Models\ExamAbsencePenaltyBand;
use App\Models\ExamAbsencePenaltyExamClass;
use App\Models\ExamAbsencePenaltySetting;
use App\Models\ExamClass;
use App\Models\ExamResult;
use App\Models\ExamStudent;
use App\Models\ExamStudentAbsence;
use App\Models\ExamSubject;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ExamAbsencePenaltyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     academicYear: AcademicYear,
     *     exam: Exam,
     *     examClass: ExamClass,
     *     examSubject: ExamSubject,
     *     examStudent: ExamStudent,
     *     admission: StudentAdmission,
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
            'name' => 'Class 10A',
        ]);

        $cay = ClassAcademicYear::create([
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
            'status' => Exam::STATUS_SCHEDULED,
        ]);

        $examClass = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $cay->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $subject = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Mathematics',
            'code' => 'MATH',
            'is_active' => true,
        ]);

        $classSubject = ClassSubject::create([
            'class_academic_year_id' => $cay->id,
            'subject_id' => $subject->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
        ]);

        $examSubject = ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'class_subject_id' => $classSubject->id,
            'subject_id' => $subject->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'total_marks' => 100,
            'passing_marks' => 40,
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Test Student',
            'father_name' => 'Test Father',
        ]);

        $admission = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $cay->id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        $examStudent = ExamStudent::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'student_admission_id' => $admission->id,
            'exam_roll_number' => 'R-1001',
        ]);

        ExamResult::create([
            'exam_id' => $exam->id,
            'exam_subject_id' => $examSubject->id,
            'exam_student_id' => $examStudent->id,
            'student_admission_id' => $admission->id,
            'marks_obtained' => 90,
            'is_absent' => false,
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

        $this->grantPermissions($user, $organization, [
            'exams.read',
            'exams.update',
            'exams.view_reports',
        ]);

        return compact(
            'organization',
            'school',
            'academicYear',
            'exam',
            'examClass',
            'examSubject',
            'examStudent',
            'admission',
            'user'
        );
    }

    /**
     * @param  list<string>  $names
     */
    private function grantPermissions(\App\Models\User $user, Organization $organization, array $names): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        setPermissionsTeamId($organization->id);

        foreach ($names as $name) {
            [$resource, $action] = explode('.', $name, 2);
            $permission = Permission::firstOrCreate([
                'name' => $name,
                'guard_name' => 'web',
                'organization_id' => $organization->id,
            ], [
                'resource' => $resource,
                'action' => $action,
            ]);
            $user->givePermissionTo($permission);
        }

        setPermissionsTeamId(null);
    }

    private function enablePenaltyForExam(
        Organization $organization,
        SchoolBranding $school,
        Exam $exam,
        ?ExamClass $examClass = null,
    ): void {
        ExamAbsencePenaltySetting::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'is_enabled' => true,
        ]);

        $bands = [
            ['min' => 0, 'max' => 4, 'marks' => 0, 'order' => 0],
            ['min' => 5, 'max' => 9, 'marks' => 3, 'order' => 1],
            ['min' => 10, 'max' => 15, 'marks' => 5, 'order' => 2],
        ];

        foreach ($bands as $band) {
            ExamAbsencePenaltyBand::create([
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'exam_id' => $exam->id,
                'min_absences' => $band['min'],
                'max_absences' => $band['max'],
                'marks_per_absence' => $band['marks'],
                'sort_order' => $band['order'],
            ]);
        }

        if ($examClass) {
            ExamAbsencePenaltyExamClass::create([
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'exam_id' => $exam->id,
                'exam_class_id' => $examClass->id,
            ]);
        }
    }

    /** @test */
    public function settings_and_absences_crud_for_an_exam(): void
    {
        $fx = $this->createFixture();

        $get = $this->jsonAs($fx['user'], 'GET', '/api/exam-absence-penalty/settings', [
            'exam_id' => $fx['exam']->id,
        ]);
        $get->assertOk()
            ->assertJsonPath('exam_id', $fx['exam']->id)
            ->assertJsonPath('is_enabled', false)
            ->assertJsonPath('bands', [])
            ->assertJsonPath('exam_class_ids', []);

        $put = $this->jsonAs($fx['user'], 'PUT', '/api/exam-absence-penalty/settings', [
            'exam_id' => $fx['exam']->id,
            'is_enabled' => true,
            'exam_class_ids' => [$fx['examClass']->id],
            'bands' => [
                ['min_absences' => 0, 'max_absences' => 4, 'marks_per_absence' => 0],
                ['min_absences' => 5, 'max_absences' => null, 'marks_per_absence' => 2],
            ],
        ]);

        $put->assertOk()
            ->assertJsonPath('is_enabled', true)
            ->assertJsonCount(2, 'bands')
            ->assertJsonPath('exam_class_ids.0', $fx['examClass']->id);

        $this->assertDatabaseHas('exam_absence_penalty_settings', [
            'exam_id' => $fx['exam']->id,
            'is_enabled' => true,
        ]);
        $this->assertDatabaseHas('exam_absence_penalty_exam_classes', [
            'exam_id' => $fx['exam']->id,
            'exam_class_id' => $fx['examClass']->id,
        ]);

        $absencesPut = $this->jsonAs($fx['user'], 'PUT', '/api/exam-absence-penalty/absences', [
            'exam_id' => $fx['exam']->id,
            'rows' => [
                [
                    'student_admission_id' => $fx['admission']->id,
                    'absence_count' => 12,
                ],
            ],
        ]);

        $absencesPut->assertOk();
        $this->assertDatabaseHas('exam_student_absences', [
            'exam_id' => $fx['exam']->id,
            'student_admission_id' => $fx['admission']->id,
            'absence_count' => 12,
        ]);

        $list = $this->jsonAs($fx['user'], 'GET', '/api/exam-absence-penalty/absences', [
            'exam_id' => $fx['exam']->id,
            'exam_class_id' => $fx['examClass']->id,
        ]);

        $list->assertOk()
            ->assertJsonPath('rows.0.absence_count', 12);
    }

    /** @test */
    public function consolidated_report_is_unchanged_when_penalty_disabled(): void
    {
        $fx = $this->createFixture();

        $response = $this->jsonAs(
            $fx['user'],
            'GET',
            "/api/exams/{$fx['exam']->id}/reports/classes/{$fx['examClass']->id}/consolidated"
        );

        $response->assertOk();
        $student = collect($response->json('students'))->first();

        $this->assertSame(90.0, (float) $student['total_obtained']);
        $this->assertSame(90.0, (float) $student['percentage']);
        $this->assertArrayNotHasKey('marks_cut', $student);
        $this->assertFalse((bool) $response->json('absence_penalty_enabled'));
    }

    /** @test */
    public function consolidated_report_applies_progressive_penalty_when_enabled_and_class_selected(): void
    {
        $fx = $this->createFixture();
        $this->enablePenaltyForExam($fx['organization'], $fx['school'], $fx['exam'], $fx['examClass']);

        ExamStudentAbsence::create([
            'organization_id' => $fx['organization']->id,
            'school_id' => $fx['school']->id,
            'exam_id' => $fx['exam']->id,
            'student_admission_id' => $fx['admission']->id,
            'absence_count' => 12,
        ]);

        // Raw total is 90; progressive cut for 12 absences = 30 → adjusted 60
        $response = $this->jsonAs(
            $fx['user'],
            'GET',
            "/api/exams/{$fx['exam']->id}/reports/classes/{$fx['examClass']->id}/consolidated"
        );

        $response->assertOk();
        $this->assertTrue((bool) $response->json('absence_penalty_enabled'));

        $student = collect($response->json('students'))->first();
        $this->assertSame(12, (int) $student['absence_count']);
        $this->assertSame(30.0, (float) $student['marks_cut']);
        $this->assertSame(90.0, (float) $student['total_obtained_raw']);
        $this->assertSame(60.0, (float) $student['total_obtained']);
        $this->assertSame(60.0, (float) $student['percentage']);

        $this->assertDatabaseHas('exam_results', [
            'exam_student_id' => $fx['examStudent']->id,
            'marks_obtained' => 90,
        ]);
    }

    /** @test */
    public function consolidated_report_does_not_cut_when_exam_class_not_selected(): void
    {
        $fx = $this->createFixture();
        // Enabled with bands, but no exam_class selected → no cut
        $this->enablePenaltyForExam($fx['organization'], $fx['school'], $fx['exam'], null);

        ExamStudentAbsence::create([
            'organization_id' => $fx['organization']->id,
            'school_id' => $fx['school']->id,
            'exam_id' => $fx['exam']->id,
            'student_admission_id' => $fx['admission']->id,
            'absence_count' => 12,
        ]);

        $response = $this->jsonAs(
            $fx['user'],
            'GET',
            "/api/exams/{$fx['exam']->id}/reports/classes/{$fx['examClass']->id}/consolidated"
        );

        $response->assertOk();
        $this->assertFalse((bool) $response->json('absence_penalty_enabled'));

        $student = collect($response->json('students'))->first();
        $this->assertSame(90.0, (float) $student['total_obtained']);
        $this->assertArrayNotHasKey('marks_cut', $student);
    }

    /** @test */
    public function settings_are_isolated_per_school(): void
    {
        $fx = $this->createFixture();
        $otherSchool = SchoolBranding::factory()->create([
            'organization_id' => $fx['organization']->id,
        ]);

        $this->enablePenaltyForExam($fx['organization'], $fx['school'], $fx['exam'], $fx['examClass']);

        $otherUser = $this->createUser(
            [],
            ['organization_id' => $fx['organization']->id, 'default_school_id' => $otherSchool->id],
            $fx['organization'],
            $otherSchool,
            null,
            ['withRole' => false]
        );
        $this->grantPermissions($otherUser, $fx['organization'], ['exams.read', 'exams.update']);

        // Other school cannot see this exam (different school) — settings for a non-owned exam 404
        $response = $this->jsonAs($otherUser, 'GET', '/api/exam-absence-penalty/settings', [
            'exam_id' => $fx['exam']->id,
        ]);
        $response->assertNotFound();
    }

    /** @test */
    public function copy_from_another_exam_copies_settings_and_maps_classes(): void
    {
        $fx = $this->createFixture();
        $this->enablePenaltyForExam($fx['organization'], $fx['school'], $fx['exam'], $fx['examClass']);

        $targetExam = Exam::factory()->create([
            'organization_id' => $fx['organization']->id,
            'school_id' => $fx['school']->id,
            'academic_year_id' => $fx['academicYear']->id,
            'start_date' => now()->addDays(20)->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'status' => Exam::STATUS_SCHEDULED,
        ]);

        $targetExamClass = ExamClass::create([
            'exam_id' => $targetExam->id,
            'class_academic_year_id' => $fx['examClass']->class_academic_year_id,
            'organization_id' => $fx['organization']->id,
            'school_id' => $fx['school']->id,
        ]);

        ExamStudentAbsence::create([
            'organization_id' => $fx['organization']->id,
            'school_id' => $fx['school']->id,
            'exam_id' => $fx['exam']->id,
            'student_admission_id' => $fx['admission']->id,
            'absence_count' => 12,
        ]);

        $response = $this->jsonAs($fx['user'], 'POST', '/api/exam-absence-penalty/copy', [
            'source_exam_id' => $fx['exam']->id,
            'target_exam_id' => $targetExam->id,
            'copy_exam_classes' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('exam_id', $targetExam->id)
            ->assertJsonPath('is_enabled', true)
            ->assertJsonCount(3, 'bands')
            ->assertJsonPath('exam_class_ids.0', $targetExamClass->id);

        $this->assertDatabaseMissing('exam_student_absences', [
            'exam_id' => $targetExam->id,
        ]);
    }
}
