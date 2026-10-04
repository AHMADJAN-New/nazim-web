<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\ClassSubject;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamResult;
use App\Models\ExamStudent;
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

class ExamResultIndexPerformanceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permissions
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     exam: Exam,
     *     examSubject: ExamSubject,
     *     examStudent: ExamStudent,
     *     examResult: ExamResult,
     *     user: \App\Models\User
     * }
     */
    private function createFixture(array $permissions = ['exams.read']): array
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
            'status' => Exam::STATUS_IN_PROGRESS,
        ]);

        $examClass = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $classAcademicYear->id,
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
            'class_academic_year_id' => $classAcademicYear->id,
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
            'full_name' => 'Ahmad',
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

        $examResult = ExamResult::create([
            'exam_id' => $exam->id,
            'exam_subject_id' => $examSubject->id,
            'exam_student_id' => $examStudent->id,
            'student_admission_id' => $admission->id,
            'marks_obtained' => 85,
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

        return compact(
            'organization',
            'school',
            'exam',
            'examSubject',
            'examStudent',
            'examResult',
            'user'
        );
    }

    /** @test */
    public function index_requires_subject_or_student_filter(): void
    {
        $fixture = $this->createFixture();

        $response = $this->jsonAs(
            $fixture['user'],
            'GET',
            '/api/exam-results',
            ['exam_id' => $fixture['exam']->id]
        );

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'exam_subject_id or exam_student_id is required',
        ]);
    }

    /** @test */
    public function index_returns_lean_payload_without_nested_graphs(): void
    {
        $fixture = $this->createFixture();

        $response = $this->jsonAs(
            $fixture['user'],
            'GET',
            '/api/exam-results',
            [
                'exam_id' => $fixture['exam']->id,
                'exam_subject_id' => $fixture['examSubject']->id,
            ]
        );

        $response->assertOk();
        $rows = $response->json();
        $this->assertIsArray($rows);
        $this->assertCount(1, $rows);

        $row = $rows[0];
        $this->assertSame($fixture['examResult']->id, $row['id']);
        $this->assertSame($fixture['examStudent']->id, $row['exam_student_id']);
        $this->assertEquals(85, (float) $row['marks_obtained']);
        $this->assertArrayNotHasKey('exam', $row);
        $this->assertArrayNotHasKey('exam_subject', $row);
        $this->assertArrayNotHasKey('exam_student', $row);
        $this->assertArrayNotHasKey('student_admission', $row);
    }
}
