<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class BackfillStudentCodesCommandTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function backfill_assigns_student_codes_for_school_scope(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->for($organization)->create();

        $id1 = (string) Str::uuid();
        $id2 = (string) Str::uuid();
        $now = now();

        DB::table('students')->insert([
            [
                'id' => $id1,
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'admission_no' => 'IMP-001',
                'student_code' => null,
                'full_name' => 'Imported One',
                'father_name' => 'Father',
                'gender' => 'male',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => $id2,
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'admission_no' => 'IMP-002',
                'student_code' => null,
                'full_name' => 'Imported Two',
                'father_name' => 'Father',
                'gender' => 'male',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        $this->artisan('students:backfill-student-codes', [
            '--school-id' => $school->id,
            '--force' => true,
        ])->assertSuccessful();

        $this->assertNotNull(DB::table('students')->where('id', $id1)->value('student_code'));
        $this->assertNotNull(DB::table('students')->where('id', $id2)->value('student_code'));
    }

    /** @test */
    public function dry_run_does_not_update(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->for($organization)->create();
        $id = (string) Str::uuid();
        $now = now();

        DB::table('students')->insert([
            'id' => $id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'admission_no' => 'IMP-DRY',
            'student_code' => null,
            'full_name' => 'Dry Run',
            'father_name' => 'Father',
            'gender' => 'male',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->artisan('students:backfill-student-codes', [
            '--school-id' => $school->id,
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertNull(DB::table('students')->where('id', $id)->value('student_code'));
    }

    /** @test */
    public function backfill_codes_continue_sequence_after_highest_existing_st_code(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->for($organization)->create();

        $year = date('Y');
        $existingId = (string) Str::uuid();
        $newId = (string) Str::uuid();
        $now = now();

        DB::table('organization_counters')->insert([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'counter_type' => 'students',
            'last_value' => 5,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('students')->insert([
            [
                'id' => $existingId,
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'admission_no' => 'EXIST-1',
                'student_code' => "ST-{$year}-0100",
                'full_name' => 'Has Code',
                'father_name' => 'F',
                'gender' => 'male',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => $newId,
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'admission_no' => 'NEW-1',
                'student_code' => null,
                'full_name' => 'Needs Code',
                'father_name' => 'F',
                'gender' => 'male',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        $this->artisan('students:backfill-student-codes', [
            '--school-id' => $school->id,
            '--force' => true,
        ])->assertSuccessful();

        $this->assertSame("ST-{$year}-0101", DB::table('students')->where('id', $newId)->value('student_code'));
        $this->assertGreaterThanOrEqual(
            101,
            (int) DB::table('organization_counters')
                ->where('organization_id', $organization->id)
                ->where('counter_type', 'students')
                ->value('last_value')
        );
    }
}
