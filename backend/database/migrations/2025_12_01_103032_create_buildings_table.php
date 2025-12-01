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
        if (!Schema::hasTable('buildings')) {
        Schema::create('buildings', function (Blueprint $table) {
                // UUID primary key
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                
                // Building information
                $table->string('building_name', 100);
                
                // Foreign key to school_branding
                $table->uuid('school_id');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
                
            $table->timestamps();
                $table->softDeletes();
                
                // Unique constraint: building_name must be unique per school (excluding soft-deleted)
                // This will be handled via partial unique index in PostgreSQL
                $table->index(['building_name', 'school_id'], 'idx_buildings_name_school');
                
                // Indexes
                $table->index('school_id');
                $table->index('deleted_at');
            });
            
            // Create partial unique index for building_name + school_id where deleted_at IS NULL
            DB::statement('CREATE UNIQUE INDEX idx_buildings_unique_name_per_school ON buildings (building_name, school_id) WHERE deleted_at IS NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('buildings');
    }
};
