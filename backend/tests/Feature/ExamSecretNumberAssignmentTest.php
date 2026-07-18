<?php

namespace Tests\Feature;

use App\Jobs\GenerateReportJob;
use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\ClassSubject;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamStudent;
use App\Models\ExamSubject;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use App\Models\Subject;
use App\Services\Exams\ExamNumberReportService;
use App\Services\Storage\FileStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;
use ZipArchive;

class ExamSecretNumberAssignmentTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permissions
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     exam: Exam,
     *     examClassLowA: ExamClass,
     *     examClassLowB: ExamClass,
     *     examClassHigh: ExamClass,
     *     studentLowA: ExamStudent,
     *     studentLowB: ExamStudent,
     *     studentHigh: ExamStudent,
     *     user: \App\Models\User
     * }
     */
    private function createMultiClassFixture(array $permissions = []): array
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $classLow = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Grade 1',
            'grade_level' => 1,
        ]);
        $classHigh = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Grade 2',
            'grade_level' => 2,
        ]);

        $cayLowA = ClassAcademicYear::create([
            'class_id' => $classLow->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);
        $cayLowB = ClassAcademicYear::create([
            'class_id' => $classLow->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'B',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);
        $cayHigh = ClassAcademicYear::create([
            'class_id' => $classHigh->id,
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

        $examClassLowA = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $cayLowA->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $examClassLowB = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $cayLowB->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $examClassHigh = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $cayHigh->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $studentLowA = $this->createLiveExamStudent(
            $organization,
            $school,
            $academicYear,
            $classLow,
            $cayLowA,
            $exam,
            $examClassLowA,
            'Zaid',
            '10'
        );
        $studentLowB = $this->createLiveExamStudent(
            $organization,
            $school,
            $academicYear,
            $classLow,
            $cayLowB,
            $exam,
            $examClassLowB,
            'Ahmad',
            '20'
        );
        $studentHigh = $this->createLiveExamStudent(
            $organization,
            $school,
            $academicYear,
            $classHigh,
            $cayHigh,
            $exam,
            $examClassHigh,
            'Bilal',
            '5'
        );

        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id, 'default_school_id' => $school->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        $this->grantPermissions($user, $organization, $permissions);

        return compact(
            'organization',
            'school',
            'exam',
            'examClassLowA',
            'examClassLowB',
            'examClassHigh',
            'studentLowA',
            'studentLowB',
            'studentHigh',
            'user'
        );
    }

    private function createLiveExamStudent(
        Organization $organization,
        SchoolBranding $school,
        AcademicYear $academicYear,
        ClassModel $class,
        ClassAcademicYear $classAcademicYear,
        Exam $exam,
        ExamClass $examClass,
        string $fullName,
        ?string $rollNumber = null,
        ?string $secretNumber = null
    ): ExamStudent {
        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => $fullName,
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

        return ExamStudent::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'student_admission_id' => $admission->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_roll_number' => $rollNumber,
            'exam_secret_number' => $secretNumber,
        ]);
    }

    /**
     * @param  list<string>  $permissions
     */
    private function grantPermissions($user, Organization $organization, array $permissions): void
    {
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
    }

    /** @test */
    public function preview_assigns_continuous_secret_numbers_by_grade_class_and_section(): void
    {
        $fixture = $this->createMultiClassFixture([
            'exams.secret_numbers.assign',
        ]);

        $response = $this->jsonAs(
            $fixture['user'],
            'POST',
            "/api/exams/{$fixture['exam']->id}/secret-numbers/preview-auto-assign",
            [
                'start_from' => '1000',
                'scope' => 'exam',
                'override_existing' => false,
            ]
        );

        $response->assertOk();
        $items = collect($response->json('items'));
        $this->assertCount(3, $items);

        $byStudentId = $items->keyBy('exam_student_id');
        $this->assertSame('1000', $byStudentId[$fixture['studentLowA']->id]['new_secret_number']);
        $this->assertSame('1001', $byStudentId[$fixture['studentLowB']->id]['new_secret_number']);
        $this->assertSame('1002', $byStudentId[$fixture['studentHigh']->id]['new_secret_number']);

        $ranges = $response->json('class_ranges');
        $this->assertCount(3, $ranges);
        $this->assertSame('Grade 1', $ranges[0]['class_name']);
        $this->assertSame('A', $ranges[0]['section']);
        $this->assertSame('1000', $ranges[0]['start']);
        $this->assertSame('1000', $ranges[0]['end']);
        $this->assertSame('Grade 1', $ranges[1]['class_name']);
        $this->assertSame('B', $ranges[1]['section']);
        $this->assertSame('1001', $ranges[1]['start']);
        $this->assertSame('Grade 2', $ranges[2]['class_name']);
        $this->assertSame('1002', $ranges[2]['start']);
    }

    /** @test */
    public function preview_skips_existing_secret_numbers_when_override_is_off(): void
    {
        $fixture = $this->createMultiClassFixture([
            'exams.secret_numbers.assign',
        ]);

        $fixture['studentLowA']->update(['exam_secret_number' => '9999']);

        $response = $this->jsonAs(
            $fixture['user'],
            'POST',
            "/api/exams/{$fixture['exam']->id}/secret-numbers/preview-auto-assign",
            [
                'start_from' => '1000',
                'scope' => 'exam',
                'override_existing' => false,
            ]
        );

        $response->assertOk();
        $items = collect($response->json('items'));
        $this->assertCount(2, $items);
        $this->assertFalse($items->contains('exam_student_id', $fixture['studentLowA']->id));
        $this->assertSame('1000', $items->firstWhere('exam_student_id', $fixture['studentLowB']->id)['new_secret_number']);
        $this->assertSame('1001', $items->firstWhere('exam_student_id', $fixture['studentHigh']->id)['new_secret_number']);
    }

    /** @test */
    public function secret_labels_emit_one_label_per_subject_for_each_student(): void
    {
        $fixture = $this->createMultiClassFixture([
            'exams.numbers.print',
        ]);

        $fixture['studentLowA']->update(['exam_secret_number' => '1340']);

        $subjectMath = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'name' => 'Math',
            'code' => 'MATH',
            'is_active' => true,
        ]);
        $subjectEnglish = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'name' => 'English',
            'code' => 'ENG',
            'is_active' => true,
        ]);

        $cayId = $fixture['examClassLowA']->class_academic_year_id;
        $classSubjectMath = ClassSubject::create([
            'class_academic_year_id' => $cayId,
            'subject_id' => $subjectMath->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'is_required' => true,
        ]);
        $classSubjectEnglish = ClassSubject::create([
            'class_academic_year_id' => $cayId,
            'subject_id' => $subjectEnglish->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'is_required' => true,
        ]);

        ExamSubject::create([
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClassLowA']->id,
            'class_subject_id' => $classSubjectMath->id,
            'subject_id' => $subjectMath->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'total_marks' => 100,
            'passing_marks' => 40,
        ]);
        ExamSubject::create([
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClassLowA']->id,
            'class_subject_id' => $classSubjectEnglish->id,
            'subject_id' => $subjectEnglish->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'total_marks' => 100,
            'passing_marks' => 40,
        ]);

        $response = $this->jsonAs(
            $fixture['user'],
            'GET',
            "/api/exams/{$fixture['exam']->id}/reports/secret-labels",
            [
                'exam_class_id' => $fixture['examClassLowA']->id,
            ]
        );

        $response->assertOk();
        $this->assertSame(2, $response->json('total_labels'));
        $html = (string) $response->json('html');
        $this->assertSame(2, preg_match_all('/data-secret-number="1340"/', $html));
        $this->assertStringContainsString('Math', $html);
        $this->assertStringContainsString('English', $html);
    }

    /** @test */
    public function exam_roll_slips_pdf_report_is_queued_asynchronously(): void
    {
        config(['queue.default' => 'database']);
        Queue::fake();

        $fixture = $this->createMultiClassFixture([
            'exams.numbers.print',
        ]);

        $fixture['studentLowA']->update(['exam_roll_number' => '100']);

        $response = $this->jsonAs(
            $fixture['user'],
            'POST',
            '/api/reports/generate',
            [
                'report_key' => 'exam_roll_slips',
                'report_type' => 'pdf',
                'async' => true,
                'title' => 'Roll Slips',
                'branding_id' => $fixture['school']->id,
                'template_name' => 'roll-slips',
                'parameters' => [
                    'exam_id' => $fixture['exam']->id,
                ],
            ]
        );

        $response->assertOk()
            ->assertJsonPath('status', 'pending')
            ->assertJsonStructure(['report_id']);

        Queue::assertPushed(GenerateReportJob::class);
    }

    /** @test */
    public function sync_format_pdf_on_roll_slips_endpoint_is_rejected(): void
    {
        $fixture = $this->createMultiClassFixture([
            'exams.numbers.print',
        ]);

        $fixture['studentLowA']->update(['exam_roll_number' => '100']);

        $response = $this->jsonAs(
            $fixture['user'],
            'GET',
            "/api/exams/{$fixture['exam']->id}/reports/roll-slips",
            ['format' => 'pdf']
        );

        $response->assertStatus(400);
        $this->assertStringContainsString('asynchronous', (string) $response->json('error'));
    }

    /** @test */
    public function roll_slips_zip_contains_one_pdf_per_class_section(): void
    {
        $fixture = $this->createMultiClassFixture();
        $fixture['studentLowA']->update(['exam_roll_number' => '100']);
        $fixture['studentLowB']->update(['exam_roll_number' => '200']);
        $fixture['studentHigh']->update(['exam_roll_number' => '300']);

        $examFolder = $this->sanitizeZipSegmentForTest($fixture['exam']->name);
        $entries = $this->generateZipEntries(
            'exam_roll_slips',
            $fixture['organization']->id,
            $fixture['school']->id,
            ['exam_id' => $fixture['exam']->id]
        );

        $this->assertCount(3, $entries);
        $this->assertContains("{$examFolder}/roll-slips/Grade 1/A/roll-slips.pdf", $entries);
        $this->assertContains("{$examFolder}/roll-slips/Grade 1/B/roll-slips.pdf", $entries);
        $this->assertContains("{$examFolder}/roll-slips/Grade 2/A/roll-slips.pdf", $entries);
    }

    /** @test */
    public function secret_labels_zip_nests_pdfs_under_class_section_subject(): void
    {
        $fixture = $this->createMultiClassFixture();
        $fixture['studentLowA']->update(['exam_secret_number' => '1340']);

        $subjectMath = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'name' => 'Math',
            'code' => 'MATH',
            'is_active' => true,
        ]);
        $subjectEnglish = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'name' => 'English',
            'code' => 'ENG',
            'is_active' => true,
        ]);

        $cayId = $fixture['examClassLowA']->class_academic_year_id;
        $classSubjectMath = ClassSubject::create([
            'class_academic_year_id' => $cayId,
            'subject_id' => $subjectMath->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'is_required' => true,
        ]);
        $classSubjectEnglish = ClassSubject::create([
            'class_academic_year_id' => $cayId,
            'subject_id' => $subjectEnglish->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'is_required' => true,
        ]);

        ExamSubject::create([
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClassLowA']->id,
            'class_subject_id' => $classSubjectMath->id,
            'subject_id' => $subjectMath->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'total_marks' => 100,
            'passing_marks' => 40,
        ]);
        ExamSubject::create([
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClassLowA']->id,
            'class_subject_id' => $classSubjectEnglish->id,
            'subject_id' => $subjectEnglish->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'total_marks' => 100,
            'passing_marks' => 40,
        ]);

        $examFolder = $this->sanitizeZipSegmentForTest($fixture['exam']->name);
        $entries = $this->generateZipEntries(
            'exam_secret_labels',
            $fixture['organization']->id,
            $fixture['school']->id,
            [
                'exam_id' => $fixture['exam']->id,
                'exam_class_id' => $fixture['examClassLowA']->id,
                'layout' => 'single',
            ]
        );

        $this->assertCount(2, $entries);
        $this->assertContains("{$examFolder}/secret-labels/Grade 1/A/Math/secret-labels.pdf", $entries);
        $this->assertContains("{$examFolder}/secret-labels/Grade 1/A/English/secret-labels.pdf", $entries);
    }

    /**
     * @param  array<string, mixed>  $parameters
     * @return list<string>
     */
    private function generateZipEntries(
        string $reportKey,
        string $organizationId,
        string $schoolId,
        array $parameters
    ): array {
        $zipBinary = null;
        $storage = $this->createMock(FileStorageService::class);
        $storage->method('storeReport')->willReturnCallback(
            function (string $content, string $filename) use (&$zipBinary): string {
                $zipBinary = $content;

                return 'reports/'.$filename;
            }
        );

        $service = new class($storage) extends ExamNumberReportService
        {
            protected function htmlToPdfContent(string $html, string $paperMode = 'a4'): string
            {
                return '%PDF-1.4 fake-exam-number-pdf';
            }
        };

        $result = $service->generateStoredZip(
            $reportKey,
            $organizationId,
            $schoolId,
            $parameters
        );

        $this->assertNotEmpty($zipBinary);
        $this->assertStringEndsWith('.zip', $result['filename']);

        $tempPath = storage_path('app/temp/test-exam-zip-'.Str::uuid().'.zip');
        file_put_contents($tempPath, $zipBinary);

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($tempPath) === true);

        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $names[] = $zip->getNameIndex($i);
        }
        $zip->close();
        @unlink($tempPath);

        return $names;
    }

    private function sanitizeZipSegmentForTest(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '_';
        }

        $value = str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], '-', $value);
        $value = preg_replace('/[\x00-\x1F\x7F]+/u', '', $value) ?? $value;
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
        $value = trim($value, " .\t\n\r\0\x0B");

        return $value !== '' ? $value : '_';
    }
}
