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
        $organizations = DB::table('organizations')->get();

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

        foreach ($organizations as $org) {
            foreach ($securityLevels as $level) {
                DB::table('security_levels')->insert([
                    'id' => Str::uuid(),
                    'organization_id' => $org->id,
                    'key' => $level['key'],
                    'label' => $level['label'],
                    'rank' => $level['rank'],
                    'active' => $level['active'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info('Security levels seeded successfully for all organizations.');
    }
}
