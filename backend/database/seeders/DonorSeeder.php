<?php

namespace Database\Seeders;

use App\Models\Donor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DonorSeeder extends Seeder
{
    /**
     * Seed the donors table.
     *
     * Creates 4 separate donors for each organization:
     * - 2 Individual donors
     * - 2 Organization donors
     */
    public function run(): void
    {
        $this->command->info('Seeding donors...');

        // Get all organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run DatabaseSeeder first.');
            return;
        }

        $totalCreated = 0;

        foreach ($organizations as $organization) {
            $this->command->info("Creating donors for {$organization->name}...");

            // Get all schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping donor seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $this->command->info("Creating donors for {$organization->name} - school: {$school->school_name}...");

                // Create donors for this school
                $created = $this->createDonorsForSchool($organization->id, $school->id);
                $totalCreated += $created;

                if ($created > 0) {
                    $this->command->info("  → Created {$created} donor(s) for {$organization->name} - {$school->school_name}");
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} donor(s)");
        }

        $this->command->info('✅ Donors seeded successfully!');
    }

    /**
     * Create donors for a specific school
     */
    protected function createDonorsForSchool(string $organizationId, string $schoolId): int
    {
        $createdCount = 0;

        // Define the donors to create (4 separate donors)
        $donors = [
            // Individual Donors
            [
                'name' => 'محمد احمد',
                'type' => 'individual',
                'phone' => '+93 70 123 4567',
                'email' => 'mohammad.ahmad@example.com',
                'address' => 'کابل، افغانستان',
                'contact_person' => null,
                'notes' => 'د منظم مرستندوی - د زکات ورکولو لپاره',
                'total_donated' => 0,
                'is_active' => true,
            ],
            [
                'name' => 'عبدالله کریم',
                'type' => 'individual',
                'phone' => '+93 79 234 5678',
                'email' => 'abdullah.karim@example.com',
                'address' => 'هرات، افغانستان',
                'contact_person' => null,
                'notes' => 'د تعلیمي پروژو لپاره مرستندوی',
                'total_donated' => 0,
                'is_active' => true,
            ],
            // Organization Donors
            [
                'name' => 'د افغانستان د خیریه موسسه',
                'type' => 'organization',
                'phone' => '+93 20 123 4567',
                'email' => 'info@afghancharity.org',
                'address' => 'کابل، افغانستان',
                'contact_person' => 'احمد شاه',
                'notes' => 'د تعلیم او روغتیا پروژو لپاره مرستندوی سازمان',
                'total_donated' => 0,
                'is_active' => true,
            ],
            [
                'name' => 'د اسلامي مرستندویانو ټولنه',
                'type' => 'organization',
                'phone' => '+93 20 234 5678',
                'email' => 'contact@islamicdonors.org',
                'address' => 'کندهار، افغانستان',
                'contact_person' => 'محمد حسن',
                'notes' => 'د مساجدو او دینی مراکزو د ودانیو لپاره مرستندوی',
                'total_donated' => 0,
                'is_active' => true,
            ],
        ];

        foreach ($donors as $donorData) {
            // Check if donor already exists for this school (by name, organization_id, and school_id)
            $exists = Donor::where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->where('name', $donorData['name'])
                ->whereNull('deleted_at')
                ->exists();

            if (!$exists) {
                Donor::create([
                    'organization_id' => $organizationId,
                    'school_id' => $schoolId,
                    'name' => $donorData['name'],
                    'type' => $donorData['type'],
                    'phone' => $donorData['phone'],
                    'email' => $donorData['email'],
                    'address' => $donorData['address'],
                    'contact_person' => $donorData['contact_person'],
                    'notes' => $donorData['notes'],
                    'total_donated' => $donorData['total_donated'],
                    'is_active' => $donorData['is_active'],
                ]);

                $createdCount++;
                $this->command->info("    ✓ Created donor: {$donorData['name']} ({$donorData['type']})");
            } else {
                $this->command->info("    ⊘ Donor {$donorData['name']} already exists for this school");
            }
        }

        return $createdCount;
    }
}

