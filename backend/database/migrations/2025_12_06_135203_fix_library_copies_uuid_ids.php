<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fixes existing library_copies that have integer IDs instead of UUIDs
     */
    public function up(): void
    {
        // Check if there are any copies with non-UUID IDs
        // PostgreSQL stores UUIDs as a special type, so we need to check the actual stored values
        $copiesWithInvalidIds = DB::select("
            SELECT id, book_id, copy_code, status 
            FROM library_copies 
            WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ");

        if (empty($copiesWithInvalidIds)) {
            return; // No copies to fix
        }

        // For each invalid copy, we need to:
        // 1. Create a new copy with a UUID
        // 2. Update library_loans to reference the new ID
        // 3. Delete the old copy
        
        foreach ($copiesWithInvalidIds as $copy) {
            $oldId = $copy->id;
            $newId = (string) Str::uuid();

            // Start transaction
            DB::beginTransaction();
            
            try {
                // Create new copy with UUID
                DB::table('library_copies')->insert([
                    'id' => $newId,
                    'book_id' => $copy->book_id,
                    'copy_code' => $copy->copy_code,
                    'status' => $copy->status,
                    'acquired_at' => DB::table('library_copies')->where('id', $oldId)->value('acquired_at'),
                    'created_at' => DB::table('library_copies')->where('id', $oldId)->value('created_at'),
                    'updated_at' => now(),
                ]);

                // Update library_loans that reference this copy
                DB::table('library_loans')
                    ->where('book_copy_id', $oldId)
                    ->update(['book_copy_id' => $newId]);

                // Delete the old copy
                DB::table('library_copies')
                    ->where('id', $oldId)
                    ->delete();

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                // Log error but continue with other copies
                \Log::error("Failed to migrate copy {$oldId}: " . $e->getMessage());
            }
        }
    }

    /**
     * Reverse the migrations.
     * Note: This cannot be fully reversed as we don't know the original integer IDs
     */
    public function down(): void
    {
        // Cannot reverse this migration as we don't store the original integer IDs
        // This is intentional - UUIDs should be used going forward
    }
};
