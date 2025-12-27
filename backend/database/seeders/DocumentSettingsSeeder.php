<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates document settings per organization + per school (strict school scoping).
     */
    public function run(): void
    {
        $createdCount = 0;
        $skippedCount = 0;

        $organizations = DB::table('organizations')->whereNull('deleted_at')->get();

        foreach ($organizations as $org) {
            $schools = DB::table('school_branding')
                ->where('organization_id', $org->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$org->name}. Skipping document settings seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                // Check if settings already exist for this organization and school
                $exists = DB::table('document_settings')
                    ->where('organization_id', $org->id)
                    ->where('school_id', $school->id)
                    ->exists();

                if ($exists) {
                    $skippedCount++;
                    continue;
                }

                DB::table('document_settings')->insert([
                    'id' => Str::uuid(),
                    'organization_id' => $org->id,
                    'school_id' => $school->id,
                    'incoming_prefix' => 'IN',
                    'outgoing_prefix' => 'OUT',
                    'year_mode' => 'gregorian', // or 'shamsi', 'hijri'
                    'reset_yearly' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $createdCount++;
            }
        }

        if ($createdCount > 0 || $skippedCount > 0) {
            $this->command->info("  → Created {$createdCount} document setting(s), skipped {$skippedCount} existing");
        }

        $this->command->info('✅ Document settings seeded successfully for all organizations and schools.');
    }
}


