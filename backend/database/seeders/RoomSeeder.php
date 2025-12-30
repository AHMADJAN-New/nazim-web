<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\Room;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    /**
     * Seed the rooms table.
     *
     * Creates rooms for all buildings.
     * Rooms are assigned to buildings but not to staff (staff_id = null).
     */
    public function run(): void
    {
        $this->command->info('Seeding rooms...');

        $buildings = Building::whereNull('deleted_at')->get();

        if ($buildings->isEmpty()) {
            $this->command->warn('No buildings found. Please run BuildingSeeder first.');
            return;
        }

        foreach ($buildings as $building) {
            $this->createRoomsForBuilding($building);
        }

        $this->command->info('Rooms seeded successfully.');
    }

    /**
     * Create rooms for a specific building.
     */
    protected function createRoomsForBuilding(Building $building): void
    {
        $roomsPerBuilding = 8;

        $createdCount = 0;
        $skippedCount = 0;

        for ($i = 1; $i <= $roomsPerBuilding; $i++) {
            $roomNumber = $this->generateRoomNumber($building->building_name, $i);

            $existing = Room::where('building_id', $building->id)
                ->where('room_number', $roomNumber)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                $skippedCount++;
                continue;
            }

            try {
                Room::create([
                    'building_id' => $building->id,
                    'school_id' => $building->school_id,
                    'room_number' => $roomNumber,
                    'staff_id' => null,
                ]);
                $createdCount++;
            } catch (\Illuminate\Database\QueryException $e) {
                if ($e->getCode() === '23505' || str_contains($e->getMessage(), 'unique constraint')) {
                    $skippedCount++;
                    continue;
                }
                throw $e;
            }
        }

        if ($createdCount > 0) {
            $this->command->info("  Created {$createdCount} room(s) for building: {$building->building_name}");
        }
        if ($skippedCount === $roomsPerBuilding && $createdCount === 0) {
            $this->command->info("  All rooms already exist for building: {$building->building_name}");
        }
    }

    /**
     * Generate room number based on building name and room index.
     */
    protected function generateRoomNumber(string $buildingName, int $index): string
    {
        $prefix = 100;

        if (stripos($buildingName, 'Main') !== false) {
            $prefix = 100;
        } elseif (stripos($buildingName, 'Academic') !== false) {
            $prefix = 200;
        } elseif (stripos($buildingName, 'Administration') !== false) {
            $prefix = 300;
        }

        return (string) ($prefix + $index);
    }
}
