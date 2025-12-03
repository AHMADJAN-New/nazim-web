<?php

namespace Database\Seeders;

use App\Helpers\OrganizationHelper;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrganizationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if "ناظم" organization already exists (by name or slug)
        $existingOrg = DB::table('organizations')
            ->where(function($query) {
                $query->where('name', 'ناظم')
                      ->orWhere('slug', 'nazim');
            })
            ->whereNull('deleted_at')
            ->first();

        if (!$existingOrg) {
            $orgId = (string) Str::uuid();

            DB::table('organizations')->insert([
                'id' => $orgId,
                'name' => 'ناظم',
                'slug' => 'nazim',
                'settings' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info('Organization "ناظم" created with ID: ' . $orgId);

            // Clear cache after creating organization
            OrganizationHelper::clearCache();

            // Assign this organization to all users who don't have an organization
            $updated = DB::table('profiles')
                ->whereNull('organization_id')
                ->update([
                    'organization_id' => $orgId,
                    'updated_at' => now(),
                ]);

            if ($updated > 0) {
                $this->command->info("Assigned organization to {$updated} existing users.");
            }
        } else {
            $this->command->info('Organization "ناظم" already exists.');

            // Still assign organization to users who don't have one
            $updated = DB::table('profiles')
                ->whereNull('organization_id')
                ->update([
                    'organization_id' => $existingOrg->id,
                    'updated_at' => now(),
                ]);

            if ($updated > 0) {
                $this->command->info("Assigned organization to {$updated} existing users.");
            }
        }
    }
}
