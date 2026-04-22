<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Services\Imports\StudentImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class StudentImportBulkTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_imports_five_hundred_students_with_admissions_in_a_single_bulk_run(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create([
            'organization_id' => $organization->id,
        ]);

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

        $parsed = [
            'meta' => [
                'template' => 'student_import',
                'sheets' => [
                    [
                        'sheet_name' => 'Grade 7-A',
                        'academic_year_id' => $academicYear->id,
                        'class_id' => $class->id,
                        'class_academic_year_id' => $classAcademicYear->id,
                        'defaults' => null,
                    ],
                ],
            ],
            'sheets' => [
                [
                    'sheet_name' => 'Grade 7-A',
                    'rows' => $this->makeRows(500),
                ],
            ],
        ];

        /** @var StudentImportService $service */
        $service = app(StudentImportService::class);

        $validation = $service->validateImport($parsed, $organization->id);

        $this->assertTrue($validation['is_valid'], json_encode($validation['sheets'], JSON_PRETTY_PRINT));
        $this->assertSame(500, $validation['total_rows']);
        $this->assertSame(500, $validation['valid_rows']);
        $this->assertSame(0, $validation['invalid_rows']);

        $result = $service->commit($parsed, $organization->id, $school->id, $validation);

        $this->assertSame(500, $result['created_students']);
        $this->assertSame(500, $result['created_admissions']);
        $this->assertSame(500, DB::table('students')->where('organization_id', $organization->id)->count());
        $this->assertSame(500, DB::table('students')->where('organization_id', $organization->id)->where('school_id', $school->id)->count());
        $this->assertSame(500, DB::table('student_admissions')->where('organization_id', $organization->id)->count());
        $this->assertSame(500, DB::table('student_admissions')->where('class_academic_year_id', $classAcademicYear->id)->count());
        $this->assertSame(500, DB::table('students')->where('organization_id', $organization->id)->whereNotNull('student_code')->count());

        $studentCodes = DB::table('students')
            ->where('organization_id', $organization->id)
            ->pluck('student_code')
            ->filter()
            ->values()
            ->all();

        $this->assertCount(500, $studentCodes);
        $this->assertCount(500, array_unique($studentCodes));
        $this->assertMatchesRegularExpression('/^ST-1405-\d+$/', $studentCodes[0]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function makeRows(int $count): array
    {
        $rows = [];

        for ($index = 0; $index < $count; $index++) {
            $rows[] = [
                '__row' => $index + 2,
                'admission_no' => '',
                'student_code' => '',
                'full_name' => 'Imported Student '.($index + 1),
                'father_name' => 'Father '.($index + 1),
                'gender' => $index % 2 === 0 ? 'Male' : 'Female',
                'guardian_name' => 'Guardian '.($index + 1),
                'guardian_phone' => '0700'.str_pad((string) $index, 6, '0', STR_PAD_LEFT),
                'student_status' => 'active',
                'admission_fee_status' => 'paid',
            ];
        }

        return $rows;
    }
}
