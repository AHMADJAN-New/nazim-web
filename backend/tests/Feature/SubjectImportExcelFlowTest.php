<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Subject;
use App\Services\Imports\SubjectImportXlsxService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SubjectImportExcelFlowTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function excel_import_creates_subjects_templates_and_class_subjects(): void
    {
        [$user, $xlsxPath, $organization, $school, $class, $classAcademicYear] = $this->makeImportScenario([
            ['name' => 'Quran', 'code' => 'QUR-01', 'hours_per_week' => 4],
            ['name' => 'Arabic', 'code' => 'ARB-01', 'hours_per_week' => 3],
            ['name' => 'Fiqh', 'code' => 'FIQ-01', 'hours_per_week' => 2],
        ]);

        try {
            $validateResponse = $this->actingAsUser($user)->post('/api/subject-import/validate', [
                'file' => new UploadedFile($xlsxPath, 'subjects_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
            ]);

            $validateResponse->assertStatus(200);
            $validateResponse->assertJsonPath('result.is_valid', true);
            $validateResponse->assertJsonPath('result.valid_rows', 3);
            $validateResponse->assertJsonPath('result.invalid_rows', 0);

            $commitResponse = $this->actingAsUser($user)->post('/api/subject-import/commit', [
                'file' => new UploadedFile($xlsxPath, 'subjects_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
            ]);

            $commitResponse->assertStatus(202);
            $commitResponse->assertJsonPath('accepted', true);
            $jobId = $commitResponse->json('job_id');
            $this->assertIsString($jobId);

            $statusResponse = $this->actingAsUser($user)->get("/api/subject-import/commit/{$jobId}/status");
            $statusResponse->assertStatus(200);
            $statusResponse->assertJsonPath('status', 'completed');
            $statusResponse->assertJsonPath('created_subjects', 3);
            $statusResponse->assertJsonPath('skipped_subjects', 0);
            $statusResponse->assertJsonPath('created_templates', 3);
            $statusResponse->assertJsonPath('created_class_subjects', 3);
            $statusResponse->assertJsonPath('error', null);

            $this->assertDatabaseCount('subjects', 3);
            $this->assertDatabaseCount('class_subject_templates', 3);
            $this->assertDatabaseCount('class_subjects', 3);

            $this->assertDatabaseHas('subjects', [
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'code' => 'QUR-01',
                'name' => 'Quran',
            ]);

            $subject = Subject::where('code', 'QUR-01')->where('school_id', $school->id)->first();
            $this->assertNotNull($subject);

            $this->assertDatabaseHas('class_subject_templates', [
                'class_id' => $class->id,
                'subject_id' => $subject->id,
                'organization_id' => $organization->id,
            ]);

            $this->assertDatabaseHas('class_subjects', [
                'class_academic_year_id' => $classAcademicYear->id,
                'subject_id' => $subject->id,
                'organization_id' => $organization->id,
            ]);

            $classSubject = DB::table('class_subjects')
                ->where('subject_id', $subject->id)
                ->where('class_academic_year_id', $classAcademicYear->id)
                ->whereNull('deleted_at')
                ->first();
            $this->assertNotNull($classSubject);
            $this->assertNotNull($classSubject->class_subject_template_id);
        } finally {
            @unlink($xlsxPath);
        }
    }

    #[Test]
    public function excel_import_skips_existing_subjects_and_assignments(): void
    {
        [$user, $xlsxPath, $organization, $school, $class, $classAcademicYear] = $this->makeImportScenario([
            ['name' => 'Quran', 'code' => 'QUR-01'],
            ['name' => 'Arabic', 'code' => 'ARB-01'],
        ]);

        $existing = Subject::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Quran Existing',
            'code' => 'QUR-01',
            'description' => null,
            'is_active' => true,
        ]);

        $templateId = (string) \Illuminate\Support\Str::uuid();
        DB::table('class_subject_templates')->insert([
            'id' => $templateId,
            'class_id' => $class->id,
            'subject_id' => $existing->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
            'credits' => null,
            'hours_per_week' => 4,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('class_subjects')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'class_subject_template_id' => $templateId,
            'class_academic_year_id' => $classAcademicYear->id,
            'subject_id' => $existing->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'teacher_id' => null,
            'room_id' => null,
            'credits' => null,
            'hours_per_week' => 4,
            'is_required' => true,
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $commitResponse = $this->actingAsUser($user)->post('/api/subject-import/commit', [
                'file' => new UploadedFile($xlsxPath, 'subjects_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
            ]);

            $commitResponse->assertStatus(202);
            $jobId = $commitResponse->json('job_id');

            $statusResponse = $this->actingAsUser($user)->get("/api/subject-import/commit/{$jobId}/status");
            $statusResponse->assertStatus(200);
            $statusResponse->assertJsonPath('status', 'completed');
            $statusResponse->assertJsonPath('created_subjects', 1);
            $statusResponse->assertJsonPath('skipped_subjects', 1);
            $statusResponse->assertJsonPath('created_templates', 1);
            $statusResponse->assertJsonPath('skipped_templates', 1);
            $statusResponse->assertJsonPath('created_class_subjects', 1);
            $statusResponse->assertJsonPath('skipped_class_subjects', 1);

            $this->assertDatabaseCount('subjects', 2);
            $this->assertDatabaseCount('class_subject_templates', 2);
            $this->assertDatabaseCount('class_subjects', 2);
            $this->assertDatabaseHas('subjects', [
                'id' => $existing->id,
                'name' => 'Quran Existing',
            ]);
        } finally {
            @unlink($xlsxPath);
        }
    }

    #[Test]
    public function excel_import_commit_completes_with_database_queue_in_testing(): void
    {
        Config::set('queue.default', 'database');

        [$user, $xlsxPath] = $this->makeImportScenario([
            ['name' => 'Hadith', 'code' => 'HAD-01'],
        ]);

        try {
            $commitResponse = $this->actingAsUser($user)->post('/api/subject-import/commit', [
                'file' => new UploadedFile($xlsxPath, 'subjects_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
            ]);

            $commitResponse->assertStatus(202);
            $jobId = $commitResponse->json('job_id');

            $statusResponse = $this->actingAsUser($user)->get("/api/subject-import/commit/{$jobId}/status");
            $statusResponse->assertStatus(200);
            $statusResponse->assertJsonPath('status', 'completed');
            $statusResponse->assertJsonPath('created_subjects', 1);
            $statusResponse->assertJsonPath('created_class_subjects', 1);
        } finally {
            @unlink($xlsxPath);
        }
    }

    /**
     * @param  array<int, array{name:string, code:string, hours_per_week?:int}>  $rows
     * @return array{0: \App\Models\User, 1: string, 2: Organization, 3: SchoolBranding, 4: ClassModel, 5: ClassAcademicYear}
     */
    private function makeImportScenario(array $rows): array
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

        $this->enableFeature($organization->id, 'subjects');

        $permission = Permission::firstOrCreate([
            'name' => 'subjects.create',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ], [
            'resource' => 'subjects',
            'action' => 'create',
            'description' => 'Create subjects',
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
            'capacity' => 40,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        /** @var SubjectImportXlsxService $xlsxService */
        $xlsxService = app(SubjectImportXlsxService::class);
        $template = $xlsxService->generateTemplate([
            'subject_fields' => ['name', 'code', 'description', 'is_active', 'is_required', 'credits', 'hours_per_week', 'notes'],
            'academic_year_id' => $academicYear->id,
            'class_academic_year_ids' => [$classAcademicYear->id],
        ], $organization->id, $school->id);

        $xlsxPath = $this->writeFilledWorkbook($template['content'], 'Grade 7-A', $rows);

        return [$user, $xlsxPath, $organization, $school, $class, $classAcademicYear];
    }

    private function enableFeature(string $organizationId, string $featureKey): void
    {
        DB::table('organization_feature_addons')->updateOrInsert(
            ['organization_id' => $organizationId, 'feature_key' => $featureKey],
            [
                'is_enabled' => true,
                'started_at' => now(),
                'expires_at' => null,
                'price_paid' => 0,
                'currency' => 'AFN',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    /**
     * @param  array<int, array{name:string, code:string, hours_per_week?:int}>  $rows
     */
    private function writeFilledWorkbook(string $content, string $sheetName, array $rows): string
    {
        $inputPath = tempnam(sys_get_temp_dir(), 'subject-import-template-');
        if ($inputPath === false) {
            throw new \RuntimeException('Failed to create temp template path');
        }

        file_put_contents($inputPath, $content);

        $spreadsheet = IOFactory::load($inputPath);
        $sheet = $spreadsheet->getSheetByName($sheetName);
        if (! $sheet instanceof Worksheet) {
            throw new \RuntimeException("Expected worksheet [{$sheetName}] was not found");
        }

        // field_order: name, code, description, is_active, is_required, credits, hours_per_week, notes
        foreach ($rows as $index => $data) {
            $row = $index + 2;
            $sheet->setCellValue("A{$row}", $data['name']);
            $sheet->setCellValue("B{$row}", $data['code']);
            $sheet->setCellValue("C{$row}", $data['description'] ?? '');
            $sheet->setCellValue("D{$row}", 'true');
            $sheet->setCellValue("E{$row}", 'true');
            $sheet->setCellValue("F{$row}", '');
            $sheet->setCellValue("G{$row}", (string) ($data['hours_per_week'] ?? 2));
            $sheet->setCellValue("H{$row}", '');
        }

        $outputPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'subject-import-filled-'.uniqid('', true).'.xlsx';
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save($outputPath);

        @unlink($inputPath);

        return $outputPath;
    }
}
