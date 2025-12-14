<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $organizations = DB::table('organizations')->get();

        foreach ($organizations as $org) {
            // Check if settings already exist for this organization
            $exists = DB::table('document_settings')
                ->where('organization_id', $org->id)
                ->whereNull('school_id')
                ->exists();

            if (!$exists) {
                DB::table('document_settings')->insert([
                    'id' => Str::uuid(),
                    'organization_id' => $org->id,
                    'school_id' => null,
                    'incoming_prefix' => 'IN',
                    'outgoing_prefix' => 'OUT',
                    'year_mode' => 'gregorian', // or 'shamsi', 'hijri'
                    'reset_yearly' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info('Document settings seeded successfully for all organizations.');
    }
}
