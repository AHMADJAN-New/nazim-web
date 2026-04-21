<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationCounter;
use App\Models\SchoolBranding;
use App\Services\CodeGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CodeGeneratorStudentBatchTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function batch_student_code_allocation_reserves_a_contiguous_block_in_one_counter_update(): void
    {
        $org = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $org->id]);

        OrganizationCounter::create([
            'organization_id' => $org->id,
            'counter_type' => OrganizationCounter::COUNTER_TYPE_STUDENTS,
            'last_value' => 10,
        ]);

        $codes = CodeGenerator::generateStudentCodesBatch($org->id, $school->id, 500);

        $this->assertCount(500, $codes);
        $this->assertCount(500, array_unique($codes));

        $counter = OrganizationCounter::query()
            ->where('organization_id', $org->id)
            ->where('counter_type', OrganizationCounter::COUNTER_TYPE_STUDENTS)
            ->first();

        $this->assertNotNull($counter);
        $this->assertSame(510, (int) $counter->last_value);
    }
}
