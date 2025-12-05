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
        Schema::create('organization_counters', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Multi-tenancy: organization_id is required
            $table->uuid('organization_id')->nullable(false);
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            // Counter type: 'students' or 'staff'
            $table->string('counter_type', 50)->nullable(false);
            
            // Last value used for this counter type in this organization
            $table->integer('last_value')->default(0);
            
            // Timestamps
            $table->timestamps();
            
            // Unique constraint: one counter per organization and counter type
            $table->unique(['organization_id', 'counter_type'], 'org_counter_unique');
            
            // Indexes
            $table->index('organization_id', 'idx_org_counters_org');
            $table->index('counter_type', 'idx_org_counters_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_counters');
    }
};
