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
        Schema::create('user_tours', function (Blueprint $table) {
            // REQUIRED: UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // User reference (from public.users table)
            $table->uuid('user_id');
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            // Tour identification
            $table->string('tour_id', 100); // e.g., 'initialSetup', 'examsFlow', 'studentAdmission'
            $table->string('tour_version', 50)->default('1.0.0'); // Track tour version for updates
            
            // Tour metadata
            $table->string('tour_title', 255)->nullable(); // Display title
            $table->text('tour_description')->nullable(); // Description
            
            // Assignment metadata
            $table->string('assigned_by', 50)->default('system'); // 'system', 'admin', 'permission'
            $table->text('required_permissions')->nullable(); // JSON array of required permissions
            $table->string('trigger_route', 255)->nullable(); // Route that triggers this tour (e.g., '/exams')
            
            // Completion status
            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->string('last_step_id', 100)->nullable(); // For resuming tours
            $table->integer('last_step_index')->default(0); // Last step index
            
            // Timestamps
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('user_id');
            $table->index(['user_id', 'tour_id']);
            $table->index(['user_id', 'is_completed']);
            $table->index('trigger_route');
            
            // Unique constraint: one tour per user
            $table->unique(['user_id', 'tour_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_tours');
    }
};
