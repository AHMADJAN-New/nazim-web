<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('rooms')) {
        Schema::create('rooms', function (Blueprint $table) {
                // UUID primary key
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                
                // Room information
                $table->string('room_number', 100);
                
                // Foreign keys
                $table->uuid('building_id');
                $table->foreign('building_id')->references('id')->on('buildings')->onDelete('cascade');
                
                $table->uuid('school_id');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
                
                $table->uuid('staff_id')->nullable();
                // Foreign key to staff (conditional - only if table exists)
                if (Schema::hasTable('staff')) {
                    $table->foreign('staff_id')->references('id')->on('staff')->onDelete('set null');
                }
                
            $table->timestamps();
                $table->softDeletes();
                
                // Unique constraint: room_number must be unique per building
                $table->unique(['room_number', 'building_id'], 'rooms_unique_room_per_building');
                
                // Indexes
                $table->index('building_id');
                $table->index('school_id');
                $table->index('staff_id');
                $table->index('deleted_at');
        });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
