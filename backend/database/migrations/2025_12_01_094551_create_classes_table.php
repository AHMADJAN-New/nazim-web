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
        // Table already exists in Supabase, so we only create if it doesn't exist
        if (!Schema::hasTable('classes')) {
        Schema::create('classes', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id')->nullable();
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->string('name', 100);
                $table->string('code', 50);
                $table->integer('grade_level')->nullable();
                $table->text('description')->nullable();
                $table->integer('default_capacity')->default(30);
                $table->boolean('is_active')->default(true);
            $table->timestamps();
                $table->softDeletes();

                // Unique constraint: code must be unique per organization
                $table->unique(['code', 'organization_id'], 'idx_classes_unique_code_per_org');
                
                // Indexes
                $table->index('organization_id');
                $table->index('grade_level');
                $table->index('is_active');
                $table->index('deleted_at');
        });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
