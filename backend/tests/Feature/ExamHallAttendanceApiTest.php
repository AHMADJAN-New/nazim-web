<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\ClassSubject;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamStudent;
use App\Models\ExamSubject;
use App\Models\ExamTime;
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

class ExamHallAttendanceApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     exam: Exam,
     *     examClassA: ExamClass,
     *     examClassB: ExamClass,
     *     examTimeA: ExamTime,
     *     examTimeB: ExamTime,
     *     studentA: Student,
     *     studentB: Student,
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

        $classA = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Class 10A',
        ]);
        $classB = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Class 10B',
        ]);

        $cayA = ClassAcademicYear::create([
            'class_id' => $classA->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);
        $cayB = ClassAcademicYear::create([
            'class_id' => $classB->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'B',
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

        $examClassA = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $cayA->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $examClassB = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $cayB->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $subject = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Math',
            'code' => 'MATH',
            'is_active' => true,
        ]);

        $classSubjectA = ClassSubject::create([
            'class_academic_year_id' => $cayA->id,
            'subject_id' => $subject->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
        ]);
        $classSubjectB = ClassSubject::create([
            'class_academic_year_id' => $cayB->id,
            'subject_id' => $subject->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
        ]);

        $examSubjectA = ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClassA->id,
            'class_subject_id' => $classSubjectA->id,
            'subject_id' => $subject->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $examSubjectB = ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClassB->id,
            'class_subject_id' => $classSubjectB->id,
            'subject_id' => $subject->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $date = now()->addDays(2)->toDateString();

        $examTimeA = ExamTime::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'exam_class_id' => $examClassA->id,
            'exam_subject_id' => $examSubjectA->id,
            'date' => $date,
            'start_time' => '08:00',
            'end_time' => '11:00',
            'is_locked' => false,
        ]);
        $examTimeB = ExamTime::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'exam_class_id' => $examClassB->id,
            'exam_subject_id' => $examSubjectB->id,
            'date' => $date,
            'start_time' => '08:00',
            'end_time' => '11:00',
            'is_locked' => false,
        ]);

        $studentA = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Student A',
        ]);
        $studentB = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Student B',
        ]);

        $admissionA = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $studentA->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $classA->id,
            'class_academic_year_id' => $cayA->id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);
        $admissionB = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $studentB->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $classB->id,
            'class_academic_year_id' => $cayB->id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        ExamStudent::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'exam_class_id' => $examClassA->id,
            'student_admission_id' => $admissionA->id,
            'exam_roll_number' => '101',
        ]);
        ExamStudent::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'exam_class_id' => $examClassB->id,
            'student_admission_id' => $admissionB->id,
            'exam_roll_number' => '201',
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

        $permission = Permission::firstOrCreate([
            'name' => 'exams.manage_attendance',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ], [
            'resource' => 'exams',
            'action' => 'manage_attendance',
        ]);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return compact(
            'organization',
            'school',
            'exam',
            'examClassA',
            'examClassB',
            'examTimeA',
            'examTimeB',
            'studentA',
            'studentB',
            'user'
        );
    }

    /** @test */
    public function it_lists_hall_sessions_grouped_by_date_and_start_time(): void
    {
        $fixture = $this->createFixture();

        $response = $this->jsonAs(
            $fixture['user'],
            'GET',
            "/api/exams/{$fixture['exam']->id}/attendance/hall/sessions"
        );

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.class_count', 2)
            ->assertJsonPath('data.0.start_time', '08:00');
    }

    /** @test */
    public function it_lists_and_marks_hall_session_students_across_classes_without_seating_map(): void
    {
        $fixture = $this->createFixture();
        $date = $fixture['examTimeA']->date->toDateString();

        $students = $this->jsonAs(
            $fixture['user'],
            'GET',
            "/api/exams/{$fixture['exam']->id}/attendance/hall/sessions/students",
            [
                'date' => $date,
                'start_time' => '08:00',
            ]
        );

        $students->assertOk()
            ->assertJsonPath('map', null)
            ->assertJsonPath('session.class_count', 2)
            ->assertJsonPath('counts.markable', 2)
            ->assertJsonCount(2, 'students');

        $rows = collect($students->json('students'));
        $this->assertTrue($rows->pluck('student_id')->contains($fixture['studentA']->id));
        $this->assertTrue($rows->pluck('student_id')->contains($fixture['studentB']->id));

        $mark = $this->jsonAs(
            $fixture['user'],
            'POST',
            "/api/exams/{$fixture['exam']->id}/attendance/mark-hall",
            [
                'attendances' => [
                    [
                        'student_id' => $fixture['studentA']->id,
                        'exam_time_id' => $fixture['examTimeA']->id,
                        'status' => 'present',
                    ],
                    [
                        'student_id' => $fixture['studentB']->id,
                        'exam_time_id' => $fixture['examTimeB']->id,
                        'status' => 'absent',
                    ],
                ],
            ]
        );

        $mark->assertOk()
            ->assertJsonPath('created', 2)
            ->assertJsonPath('updated', 0);

        $this->assertDatabaseHas('exam_attendances', [
            'exam_time_id' => $fixture['examTimeA']->id,
            'student_id' => $fixture['studentA']->id,
            'status' => 'present',
        ]);
        $this->assertDatabaseHas('exam_attendances', [
            'exam_time_id' => $fixture['examTimeB']->id,
            'student_id' => $fixture['studentB']->id,
            'status' => 'absent',
        ]);
    }
}
