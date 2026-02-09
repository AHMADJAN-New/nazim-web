<?php

namespace Database\Seeders;

use App\Models\SchoolAdmissionRules;
use App\Models\SchoolBranding;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SchoolAdmissionRulesSeeder extends Seeder
{
    /**
     * Seed admission rules for a specific school
     * 
     * @param string $organizationId
     * @param string $schoolId
     * @return bool True if created, false if already exists
     */
    public static function seedForSchool(string $organizationId, string $schoolId): bool
    {
        // Check if rules already exist for this school
        $existing = SchoolAdmissionRules::where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return false; // Already exists
        }

        // Verify school exists and belongs to organization
        $school = SchoolBranding::where('id', $schoolId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            Log::warning('Cannot seed admission rules: School not found or does not belong to organization', [
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
            ]);
            return false;
        }

        // Create default rules (content + section labels from DB)
        $commitmentItems = SchoolAdmissionRules::defaultCommitmentItems();
        $guaranteeText = SchoolAdmissionRules::defaultGuaranteeText();
        $labels = SchoolAdmissionRules::defaultLabels();

        try {
            SchoolAdmissionRules::create([
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'commitment_items' => $commitmentItems,
                'guarantee_text' => $guaranteeText,
                'labels' => $labels,
            ]);

            Log::info('School admission rules seeded', [
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to seed school admission rules', [
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Run the database seeds for all existing schools
     */
    public function run(): void
    {
        $this->command->info('Seeding school admission rules...');

        $schools = SchoolBranding::whereNull('deleted_at')->get();

        if ($schools->isEmpty()) {
            $this->command->warn('No schools found. Please create schools first.');
            return;
        }

        $createdCount = 0;
        $skippedCount = 0;

        foreach ($schools as $school) {
            $created = self::seedForSchool($school->organization_id, $school->id);
            if ($created) {
                $createdCount++;
            } else {
                $skippedCount++;
            }
        }

        $this->command->info("School admission rules seeded: {$createdCount} created, {$skippedCount} skipped.");
    }
}
