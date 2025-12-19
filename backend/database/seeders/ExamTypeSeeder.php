<?php

namespace Database\Seeders;

use App\Models\ExamType;
use App\Models\Organization;
use Illuminate\Database\Seeder;

class ExamTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultTypes = [
            ['name' => 'Monthly', 'code' => 'MONTHLY', 'description' => 'Monthly examination', 'display_order' => 1],
            ['name' => '2 Months', 'code' => '2M', 'description' => 'Two months examination', 'display_order' => 2],
            ['name' => '3 Months', 'code' => '3M', 'description' => 'Three months examination', 'display_order' => 3],
            ['name' => 'Mid-Term', 'code' => 'MID', 'description' => 'Mid-term examination', 'display_order' => 4],
            ['name' => 'Final', 'code' => 'FINAL', 'description' => 'Final examination', 'display_order' => 5],
            ['name' => 'Annual', 'code' => 'ANNUAL', 'description' => 'Annual examination', 'display_order' => 6],
            ['name' => 'Supplementary', 'code' => 'SUPP', 'description' => 'Supplementary examination', 'display_order' => 7],
            ['name' => 'Remedial', 'code' => 'REMEDIAL', 'description' => 'Remedial examination', 'display_order' => 8],
        ];

        // Create exam types for each organization
        $organizations = Organization::all();

        foreach ($organizations as $organization) {
            foreach ($defaultTypes as $type) {
                ExamType::firstOrCreate(
                    [
                        'organization_id' => $organization->id,
                        'code' => $type['code'],
                    ],
                    [
                        'name' => $type['name'],
                        'description' => $type['description'],
                        'display_order' => $type['display_order'],
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}

