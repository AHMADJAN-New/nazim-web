<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Services\Imports\StudentImportXlsxService;
use Illuminate\Support\Facades\Config;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class StudentImportExcelFlowTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function excel_import_endpoints_validate_commit_and_report_status_for_five_hundred_students(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create([
            'organization_id' => $organization->id,
        ]);
        $user = $this->createUser(
            [],
            [
                'organization_id' => $organization->id,
                'default_school_id' => $school->id,
            ],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        $permission = Permission::firstOrCreate([
            'name' => 'students.import',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        $academicYear = AcademicYear::factory()->current()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => '1405-1406',
        ]);
        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Grade 7',
            'code' => 'GR7',
        ]);
        $classAcademicYear = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'capacity' => 600,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        /** @var StudentImportXlsxService $xlsxService */
        $xlsxService = app(StudentImportXlsxService::class);
        $template = $xlsxService->generateTemplate([
            'student_fields' => [
                'admission_no',
                'student_code',
                'full_name',
                'father_name',
                'gender',
                'guardian_name',
                'guardian_phone',
                'student_status',
                'admission_fee_status',
            ],
            'admission_fields' => [
                'admission_date',
                'enrollment_status',
            ],
            'academic_year_id' => $academicYear->id,
            'class_academic_year_ids' => [$classAcademicYear->id],
        ], $organization->id, $school->id);

        $xlsxPath = $this->writeFilledWorkbook($template['content'], 'Grade 7-A', 500);

        try {
            $validateResponse = $this->actingAsUser($user)->post('/api/student-import/validate', [
                'file' => new UploadedFile($xlsxPath, 'students_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
            ]);

            $validateResponse->assertStatus(200);
            $validateResponse->assertJsonPath('result.is_valid', true);
            $validateResponse->assertJsonPath('result.valid_rows', 500);
            $validateResponse->assertJsonPath('result.invalid_rows', 0);

            $commitResponse = $this->actingAsUser($user)->post('/api/student-import/commit', [
                'file' => new UploadedFile($xlsxPath, 'students_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
            ]);

            $commitResponse->assertStatus(202);
            $commitResponse->assertJsonPath('accepted', true);
            $jobId = $commitResponse->json('job_id');

            $this->assertIsString($jobId);
            $this->assertNotSame('', $jobId);

            $statusResponse = $this->actingAsUser($user)->get("/api/student-import/commit/{$jobId}/status");

            $statusResponse->assertStatus(200);
            $statusResponse->assertJsonPath('status', 'completed');
            $statusResponse->assertJsonPath('created_students', 500);
            $statusResponse->assertJsonPath('created_admissions', 500);
            $statusResponse->assertJsonPath('error', null);

            $this->assertDatabaseCount('students', 500);
            $this->assertDatabaseCount('student_admissions', 500);
        } finally {
            @unlink($xlsxPath);
        }
    }

    #[Test]
    public function excel_import_commit_does_not_stay_queued_in_local_like_database_queue_mode(): void
    {
        Config::set('queue.default', 'database');

        [$user, $xlsxPath] = $this->makeImportScenario();

        try {
            $commitResponse = $this->actingAsUser($user)->post('/api/student-import/commit', [
                'file' => new UploadedFile($xlsxPath, 'students_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
            ]);

            $commitResponse->assertStatus(202);
            $jobId = $commitResponse->json('job_id');

            $statusResponse = $this->actingAsUser($user)->get("/api/student-import/commit/{$jobId}/status");

            $statusResponse->assertStatus(200);
            $statusResponse->assertJsonPath('status', 'completed');
            $statusResponse->assertJsonPath('created_students', 500);
            $statusResponse->assertJsonPath('created_admissions', 500);
        } finally {
            @unlink($xlsxPath);
        }
    }

    /**
     * @return array{0: \App\Models\User, 1: string}
     */
    private function makeImportScenario(): array
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create([
            'organization_id' => $organization->id,
        ]);
        $user = $this->createUser(
            [],
            [
                'organization_id' => $organization->id,
                'default_school_id' => $school->id,
            ],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        $permission = Permission::firstOrCreate([
            'name' => 'students.import',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        $academicYear = AcademicYear::factory()->current()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => '1405-1406',
        ]);
        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Grade 7',
            'code' => 'GR7',
        ]);
        $classAcademicYear = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'capacity' => 600,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        /** @var StudentImportXlsxService $xlsxService */
        $xlsxService = app(StudentImportXlsxService::class);
        $template = $xlsxService->generateTemplate([
            'student_fields' => [
                'admission_no',
                'student_code',
                'full_name',
                'father_name',
                'gender',
                'guardian_name',
                'guardian_phone',
                'student_status',
                'admission_fee_status',
            ],
            'admission_fields' => [
                'admission_date',
                'enrollment_status',
            ],
            'academic_year_id' => $academicYear->id,
            'class_academic_year_ids' => [$classAcademicYear->id],
        ], $organization->id, $school->id);

        $xlsxPath = $this->writeFilledWorkbook($template['content'], 'Grade 7-A', 500);

        return [$user, $xlsxPath];
    }

    private function writeFilledWorkbook(string $content, string $sheetName, int $rowCount): string
    {
        $inputPath = tempnam(sys_get_temp_dir(), 'student-import-template-');
        if ($inputPath === false) {
            throw new \RuntimeException('Failed to create temp template path');
        }

        file_put_contents($inputPath, $content);

        $spreadsheet = IOFactory::load($inputPath);
        $sheet = $spreadsheet->getSheetByName($sheetName);
        if (! $sheet instanceof Worksheet) {
            throw new \RuntimeException("Expected worksheet [{$sheetName}] was not found");
        }

        for ($index = 0; $index < $rowCount; $index++) {
            $row = $index + 2;
            $sheet->setCellValue("A{$row}", '');
            $sheet->setCellValue("B{$row}", '');
            $sheet->setCellValue("C{$row}", 'Imported Student '.($index + 1));
            $sheet->setCellValue("D{$row}", 'Father '.($index + 1));
            $sheet->setCellValue("E{$row}", $index % 2 === 0 ? 'Male' : 'Female');
            $sheet->setCellValue("F{$row}", 'Guardian '.($index + 1));
            $sheet->setCellValue("G{$row}", '0700'.str_pad((string) $index, 6, '0', STR_PAD_LEFT));
            $sheet->setCellValue("H{$row}", 'active');
            $sheet->setCellValue("I{$row}", 'paid');
            $sheet->setCellValue("J{$row}", '2026-04-22');
            $sheet->setCellValue("K{$row}", 'admitted');
        }

        $outputPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'student-import-filled-'.uniqid('', true).'.xlsx';
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save($outputPath);

        @unlink($inputPath);

        return $outputPath;
    }
}
