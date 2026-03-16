<?php

namespace Database\Seeders;

use App\Models\FacilityType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FacilityTypeSeeder extends Seeder
{
    /**
     * Seed default facility types per organization (for org-admin facilities / mosques).
     *
     * Creates: Mosque, Community Center, Other
     */
    public function run(): void
    {
        $this->command->info('Seeding facility types...');

        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Skipping facility types.');
            return;
        }

        $defaults = [
            ['name' => 'Mosque', 'code' => 'mosque', 'display_order' => 10],
            ['name' => 'Community Center', 'code' => 'community_center', 'display_order' => 20],
            ['name' => 'Other', 'code' => 'other', 'display_order' => 99],
        ];

        $created = 0;
        foreach ($organizations as $org) {
            foreach ($defaults as $idx => $row) {
                $exists = FacilityType::where('organization_id', $org->id)
                    ->where('code', $row['code'])
                    ->whereNull('deleted_at')
                    ->exists();

                if (! $exists) {
                    FacilityType::create([
                        'organization_id' => $org->id,
                        'name' => $row['name'],
                        'code' => $row['code'],
                        'display_order' => $row['display_order'],
                    ]);
                    $created++;
                }
            }
        }

        $this->command->info("Facility types seeded. Created: {$created}");
    }
}
