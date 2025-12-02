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
        if (Schema::hasTable('subjects')) {
            return;
        }

        // Check if required tables exist before creating foreign keys
        $organizationsExists = Schema::hasTable('organizations');

        Schema::create('subjects', function (Blueprint $table) use ($organizationsExists) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->nullable();
            $table->string('name', 100);
            $table->string('code', 50);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys - only create if referenced tables exist
            if ($organizationsExists) {
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            }

            // Indexes for performance
            $table->index('organization_id');
            $table->index('is_active');
            $table->index('deleted_at');

            // Unique constraint: code must be unique per organization (or globally if organization_id is NULL)
            // Note: PostgreSQL partial unique index for soft deletes
            $table->unique(['code', 'organization_id', 'deleted_at'], 'idx_subjects_unique_code_per_org');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subjects');
    }
};
