<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamStudent;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ExamStudentLiveAdmissionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permissions
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     exam: Exam,
     *     examClass: ExamClass,
     *     liveExamStudent: ExamStudent,
     *     deletedStudentExamStudent: ExamStudent,
     *     inactiveAdmissionExamStudent: ExamStudent,
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
            'name' => 'متوسطه',
        ]);

        $classAcademicYear = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'ب',
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

        $liveStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'ابراهیم',
        ]);
        $liveAdmission = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $liveStudent->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);
        $liveExamStudent = ExamStudent::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'student_admission_id' => $liveAdmission->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_roll_number' => '728',
        ]);

        $deletedStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Should Not Appear',
        ]);
        $deletedAdmission = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $deletedStudent->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);
        $deletedStudentExamStudent = ExamStudent::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'student_admission_id' => $deletedAdmission->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_roll_number' => '721',
        ]);
        $deletedStudent->delete();

        $inactiveStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Inactive Admission',
        ]);
        $inactiveAdmission = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $inactiveStudent->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'withdrawn',
            'is_boarder' => false,
        ]);
        $inactiveAdmissionExamStudent = ExamStudent::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'student_admission_id' => $inactiveAdmission->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_roll_number' => '764',
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
            'examClass',
            'liveExamStudent',
            'deletedStudentExamStudent',
            'inactiveAdmissionExamStudent',
            'user'
        );
    }

    /** @test */
    public function roll_number_list_excludes_deleted_students_and_inactive_admissions(): void
    {
        $fixture = $this->createFixture([
            'exams.read',
        ]);

        $response = $this->jsonAs(
            $fixture['user'],
            'GET',
            "/api/exams/{$fixture['exam']->id}/students-with-numbers"
        );

        $response->assertOk();
        $payload = $response->json();
        $students = collect(is_array($payload) && array_is_list($payload)
            ? $payload
            : ($payload['data'] ?? $payload['students'] ?? []));

        $this->assertSame(
            ['ابراهیم'],
            $students->pluck('full_name')->values()->all(),
            'Unexpected payload: '.json_encode($payload)
        );

        $this->assertCount(1, $students);
        $this->assertSame($fixture['liveExamStudent']->id, $students->first()['exam_student_id']);
        $this->assertSame('ابراهیم', $students->first()['full_name']);
        $this->assertFalse($students->contains(fn ($row) => ($row['full_name'] ?? '') === 'Unknown'));
        $this->assertFalse($students->contains(
            fn ($row) => ($row['exam_student_id'] ?? null) === $fixture['deletedStudentExamStudent']->id
        ));
        $this->assertFalse($students->contains(
            fn ($row) => ($row['exam_student_id'] ?? null) === $fixture['inactiveAdmissionExamStudent']->id
        ));
    }

    /** @test */
    public function exam_enrollment_list_excludes_deleted_students_and_inactive_admissions(): void
    {
        $fixture = $this->createFixture(['exams.read']);

        $response = $this->jsonAs(
            $fixture['user'],
            'GET',
            '/api/exam-students',
            ['exam_id' => $fixture['exam']->id]
        );

        $response->assertOk();
        $students = collect($response->json());

        $this->assertCount(1, $students);
        $this->assertSame($fixture['liveExamStudent']->id, $students->first()['id']);
    }

    /** @test */
    public function deleting_student_soft_deletes_related_exam_enrollments(): void
    {
        $fixture = $this->createFixture(['students.delete']);

        $examStudentId = $fixture['liveExamStudent']->id;
        $admissionId = $fixture['liveExamStudent']->student_admission_id;
        $studentId = StudentAdmission::findOrFail($admissionId)->student_id;

        $response = $this->jsonAs(
            $fixture['user'],
            'DELETE',
            "/api/students/{$studentId}"
        );

        $response->assertStatus(204);

        $this->assertSoftDeleted('students', ['id' => $studentId]);
        $this->assertSoftDeleted('student_admissions', ['id' => $admissionId]);
        $this->assertSoftDeleted('exam_students', ['id' => $examStudentId]);
    }

    /** @test */
    public function exam_students_soft_delete_orphaned_command_repairs_legacy_rows(): void
    {
        $fixture = $this->createFixture();

        $orphanedId = $fixture['deletedStudentExamStudent']->id;

        // Fixture left exam enrollment alive while student is soft-deleted.
        $this->assertDatabaseHas('exam_students', [
            'id' => $orphanedId,
            'deleted_at' => null,
        ]);

        $this->artisan('exam-students:soft-delete-orphaned', [
            '--organization-id' => $fixture['organization']->id,
        ])->assertSuccessful();

        $this->assertSoftDeleted('exam_students', ['id' => $orphanedId]);
    }
}
