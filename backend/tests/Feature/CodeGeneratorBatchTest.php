<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\OrganizationCounter;
use App\Models\SchoolBranding;
use App\Services\CodeGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CodeGeneratorBatchTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function student_code_batch_generation_does_not_scale_queries_with_batch_size(): void
    {
        $smallBatch = $this->generateBatchWithQueryCount(2);
        $largeBatch = $this->generateBatchWithQueryCount(10);

        $this->assertCount(2, $smallBatch['codes']);
        $this->assertCount(10, $largeBatch['codes']);
        $this->assertMatchesRegularExpression('/^ST-1405-\d+$/', $largeBatch['codes'][0]);
        $this->assertLessThanOrEqual(
            $smallBatch['queries'] + 4,
            $largeBatch['queries'],
            "Expected batch generation query count to stay nearly flat, but 2 codes used {$smallBatch['queries']} queries and 10 codes used {$largeBatch['queries']} queries."
        );
    }

    /**
     * @return array{codes: array<int, string>, queries: int}
     */
    private function generateBatchWithQueryCount(int $count): array
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->for($organization)->create();

        AcademicYear::factory()->current()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => '1405-1406',
        ]);

        OrganizationCounter::create([
            'organization_id' => $organization->id,
            'counter_type' => OrganizationCounter::COUNTER_TYPE_STUDENTS,
            'last_value' => 0,
        ]);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $codes = CodeGenerator::generateStudentCodesBatch($organization->id, $school->id, $count);

        $queries = count(DB::getQueryLog());

        DB::disableQueryLog();

        return [
            'codes' => $codes,
            'queries' => $queries,
        ];
    }
}
