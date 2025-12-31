<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('maintenance_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('message')->nullable();
            $table->json('affected_services')->nullable(); // Array of affected service names
            $table->timestamp('started_at');
            $table->timestamp('scheduled_end_at')->nullable();
            $table->timestamp('actual_end_at')->nullable();
            $table->uuid('started_by')->nullable(); // User who initiated maintenance
            $table->uuid('ended_by')->nullable(); // User who ended maintenance
            $table->string('status')->default('active'); // active, completed, cancelled
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('started_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('ended_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_logs');
    }
};
