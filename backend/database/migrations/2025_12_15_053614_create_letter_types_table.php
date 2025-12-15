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
        Schema::create('letter_types', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->string('key', 50); // Unique identifier like 'application', 'moe_letter', etc.
            $table->string('name', 255); // Display name like 'Application Letters'
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            // Unique constraint: key must be unique per organization
            $table->unique(['organization_id', 'key']);
            $table->index(['organization_id', 'active']);
            $table->index('school_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('letter_types');
    }
};
