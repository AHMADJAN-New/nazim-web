<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\Room;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoomSeeder extends Seeder
{
    /**
     * Seed the rooms table.
     *
     * Creates rooms for all buildings in both organizations.
     * Rooms are assigned to buildings but not to staff (staff_id = null).
     */
    public function run(): void
    {
        $this->command->info('Seeding rooms...');

        // Get organizations
        $org1 = DB::table('organizations')
            ->where('slug', 'org-one')
            ->whereNull('deleted_at')
            ->first();

        $org2 = DB::table('organizations')
            ->where('slug', 'org-two')
            ->whereNull('deleted_at')
            ->first();

        if (!$org1) {
            $this->command->warn('Organization One not found. Please run DatabaseSeeder first.');
            return;
        }

        if (!$org2) {
            $this->command->warn('Organization Two not found. Please run DatabaseSeeder first.');
            return;
        }

        // Get school IDs for Organization One
        $org1SchoolIds = DB::table('school_branding')
            ->where('organization_id', $org1->id)
            ->whereNull('deleted_at')
            ->pluck('id')
            ->toArray();

        // Get all buildings for Organization One
        $org1Buildings = Building::whereIn('school_id', $org1SchoolIds)
            ->whereNull('deleted_at')
            ->get();

        // Get school IDs for Organization Two
        $org2SchoolIds = DB::table('school_branding')
            ->where('organization_id', $org2->id)
            ->whereNull('deleted_at')
            ->pluck('id')
            ->toArray();

        // Get all buildings for Organization Two
        $org2Buildings = Building::whereIn('school_id', $org2SchoolIds)
            ->whereNull('deleted_at')
            ->get();

        if ($org1Buildings->isEmpty()) {
            $this->command->warn('No buildings found for Organization One. Please run BuildingSeeder first.');
        } else {
            $this->command->info('Creating rooms for Organization One...');
            foreach ($org1Buildings as $building) {
                $this->createRoomsForBuilding($building);
            }
        }

        if ($org2Buildings->isEmpty()) {
            $this->command->warn('No buildings found for Organization Two. Please run BuildingSeeder first.');
        } else {
            $this->command->info('Creating rooms for Organization Two...');
            foreach ($org2Buildings as $building) {
                $this->createRoomsForBuilding($building);
            }
        }

        $this->command->info('✅ Rooms seeded successfully!');
    }

    /**
     * Create rooms for a specific building
     */
    protected function createRoomsForBuilding(Building $building): void
    {
        // Number of rooms to create per building
        $roomsPerBuilding = 8;

        $createdCount = 0;
        $skippedCount = 0;
        
        for ($i = 1; $i <= $roomsPerBuilding; $i++) {
            // Generate room number (e.g., "101", "102", "201", "202")
            // For Main Building: 101-108
            // For Academic Building: 201-208
            // For Administration Building: 301-308
            $roomNumber = $this->generateRoomNumber($building->building_name, $i);

            // Check if room already exists for this building (not soft-deleted)
            $existing = Room::where('building_id', $building->id)
                ->where('room_number', $roomNumber)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                $skippedCount++;
                continue;
            }

            // Try to create the room, catch unique constraint violations
            try {
                Room::create([
                    'building_id' => $building->id,
                    'school_id' => $building->school_id,
                    'room_number' => $roomNumber,
                    'staff_id' => null, // No staff assigned
                ]);
                $createdCount++;
            } catch (\Illuminate\Database\QueryException $e) {
                // Handle unique constraint violation gracefully (room already exists)
                if ($e->getCode() === '23505' || str_contains($e->getMessage(), 'unique constraint')) {
                    $skippedCount++;
                    continue;
                }
                // Re-throw if it's a different error
                throw $e;
            }
        }

        if ($createdCount > 0) {
            $this->command->info("  → Created {$createdCount} room(s) for building: {$building->building_name}");
        }
        if ($skippedCount === $roomsPerBuilding && $createdCount === 0) {
            $this->command->info("  ✓ All rooms already exist for building: {$building->building_name}");
        }
    }

    /**
     * Generate room number based on building name and room index
     */
    protected function generateRoomNumber(string $buildingName, int $index): string
    {
        // Determine floor/prefix based on building name
        $prefix = 100; // Default prefix
        
        if (stripos($buildingName, 'Main') !== false) {
            $prefix = 100; // Rooms 101-108
        } elseif (stripos($buildingName, 'Academic') !== false) {
            $prefix = 200; // Rooms 201-208
        } elseif (stripos($buildingName, 'Administration') !== false) {
            $prefix = 300; // Rooms 301-308
        }

        return (string) ($prefix + $index);
    }
}

