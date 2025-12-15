<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SecurityLevelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding security levels...');

        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run DatabaseSeeder first.');
            return;
        }

        $securityLevels = [
            [
                'key' => 'public',
                'label' => 'Public',
                'rank' => 0,
                'active' => true,
            ],
            [
                'key' => 'internal',
                'label' => 'Internal',
                'rank' => 10,
                'active' => true,
            ],
            [
                'key' => 'confidential',
                'label' => 'Confidential',
                'rank' => 20,
                'active' => true,
            ],
            [
                'key' => 'secret',
                'label' => 'Secret',
                'rank' => 30,
                'active' => true,
            ],
            [
                'key' => 'top_secret',
                'label' => 'Top Secret',
                'rank' => 40,
                'active' => true,
            ],
        ];

        $totalCreated = 0;

        foreach ($organizations as $org) {
            $this->command->info("Creating security levels for {$org->name}...");
            $created = 0;

            foreach ($securityLevels as $level) {
                // Check if security level already exists
                $exists = DB::table('security_levels')
                    ->where('organization_id', $org->id)
                    ->where('key', $level['key'])
                    ->exists();

                if ($exists) {
                    $this->command->info("  ⚠ Security level '{$level['key']}' already exists for {$org->name}. Skipping.");
                    continue;
                }

                DB::table('security_levels')->insert([
                    'id' => (string) Str::uuid(),
                    'organization_id' => $org->id,
                    'key' => $level['key'],
                    'label' => $level['label'],
                    'rank' => $level['rank'],
                    'active' => $level['active'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $created++;
                $this->command->info("  ✓ Created security level: {$level['label']} ({$level['key']})");
            }

            $totalCreated += $created;
            $this->command->info("  → Created {$created} security level(s) for {$org->name}");
        }

        $this->command->info("✅ Security levels seeded successfully. Total created: {$totalCreated}");
    }
}
