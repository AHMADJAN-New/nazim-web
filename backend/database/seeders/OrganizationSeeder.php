<?php

namespace Database\Seeders;

use App\Helpers\OrganizationHelper;
use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrganizationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding organizations...');

        $organizations = [
            [
                'name' => 'Nazim',
                'slug' => 'nazim',
                'description' => 'Default organization',
            ],
            [
                'name' => 'Organization One',
                'slug' => 'org-one',
                'description' => 'First test organization',
            ],
            [
                'name' => 'Organization Two',
                'slug' => 'org-two',
                'description' => 'Second test organization',
            ],
        ];

        $createdOrgIds = [];

        foreach ($organizations as $orgData) {
            $organization = Organization::firstOrCreate(
                ['slug' => $orgData['slug']],
                [
                    'name' => $orgData['name'],
                    'description' => $orgData['description'],
                    'settings' => [],
                    'is_active' => true,
                ]
            );

            $createdOrgIds[$orgData['slug']] = $organization->id;

            if ($organization->wasRecentlyCreated) {
                $this->command->info("Created organization: {$organization->name} (ID: {$organization->id})");
            } else {
                $this->command->info("Organization '{$organization->name}' already exists.");
            }
        }

        OrganizationHelper::clearCache();

        $defaultOrgId = $createdOrgIds['nazim']
            ?? Organization::where('slug', 'nazim')->whereNull('deleted_at')->value('id')
            ?? $createdOrgIds['org-one']
            ?? Organization::where('slug', 'org-one')->whereNull('deleted_at')->value('id');

        if ($defaultOrgId) {
            $updated = DB::table('profiles')
                ->whereNull('organization_id')
                ->where(function ($query) {
                    $query->whereNull('role')
                        ->orWhere('role', '!=', 'platform_admin');
                })
                ->update([
                    'organization_id' => $defaultOrgId,
                    'updated_at' => now(),
                ]);

            if ($updated > 0) {
                $this->command->info("Assigned default organization to {$updated} existing users.");
            }
        }
    }
}
