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
use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use App\Models\Subject;
use App\Services\Exams\ExamMarksEntryReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use ReflectionMethod;
use Tests\TestCase;

class ExamMarksEntryReportApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     exam: Exam,
     *     examClass: ExamClass,
     *     examSubject: ExamSubject,
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

        ExamStudent::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'student_admission_id' => $admission->id,
            'exam_roll_number' => 'R-1001',
            'exam_secret_number' => 'S-9001',
        ]);

        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id, 'default_school_id' => $school->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        return compact('organization', 'school', 'exam', 'examClass', 'examSubject', 'user');
    }

    /** @test */
    public function excel_zip_pack_contains_class_subject_file(): void
    {
        $fx = $this->createFixture();

        $service = app(ExamMarksEntryReportService::class);
        $result = $service->generateStoredZip(
            'exam_marks_entry_excel_zip',
            $fx['organization']->id,
            $fx['school']->id,
            [
                'exam_id' => $fx['exam']->id,
                'student_id_mode' => 'roll',
            ]
        );

        $this->assertNotEmpty($result['path']);
        $this->assertStringEndsWith('.zip', $result['filename']);
        $this->assertGreaterThan(0, $result['row_count']);
    }

    /** @test */
    public function excel_zip_respects_class_and_subject_filters(): void
    {
        $fx = $this->createFixture();

        $service = app(ExamMarksEntryReportService::class);
        $result = $service->generateStoredZip(
            'exam_marks_entry_excel_zip',
            $fx['organization']->id,
            $fx['school']->id,
            [
                'exam_id' => $fx['exam']->id,
                'exam_class_ids' => [$fx['examClass']->id],
                'exam_subject_ids' => [$fx['examSubject']->id],
                'student_id_mode' => 'both',
            ]
        );

        $this->assertGreaterThan(0, $result['row_count']);
    }

    /** @test */
    public function secret_mode_omits_name_columns(): void
    {
        $service = app(ExamMarksEntryReportService::class);
        $method = new ReflectionMethod(ExamMarksEntryReportService::class, 'columnsForMode');
        $method->setAccessible(true);

        /** @var list<array{key: string, label: string}> $columns */
        $columns = $method->invoke($service, ExamMarksEntryReportService::MODE_SECRET);
        $keys = array_column($columns, 'key');

        $this->assertContains('secret_number', $keys);
        $this->assertContains('marks', $keys);
        $this->assertContains('absent', $keys);
        $this->assertNotContains('row_number', $keys);
        $this->assertNotContains('roll_number', $keys);
        $this->assertNotContains('student_name', $keys);
        $this->assertNotContains('father_name', $keys);
    }

    /** @test */
    public function secret_mode_zip_generates_successfully(): void
    {
        $fx = $this->createFixture();

        $service = app(ExamMarksEntryReportService::class);
        $result = $service->generateStoredZip(
            'exam_marks_entry_excel_zip',
            $fx['organization']->id,
            $fx['school']->id,
            [
                'exam_id' => $fx['exam']->id,
                'student_id_mode' => 'secret',
            ]
        );

        $this->assertNotEmpty($result['path']);
        $this->assertGreaterThan(0, $result['row_count']);
    }
}
