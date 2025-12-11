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
        Schema::create('grades', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->string('name_en', 255);
            $table->string('name_ar', 255);
            $table->string('name_ps', 255);
            $table->string('name_fa', 255);
            $table->decimal('min_percentage', 5, 2);
            $table->decimal('max_percentage', 5, 2);
            $table->integer('order');
            $table->boolean('is_pass')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('organization_id');
            $table->index('order');
            $table->index('deleted_at');
            $table->index(['organization_id', 'min_percentage', 'max_percentage']);
        });

        // Check constraint: max_percentage >= min_percentage
        DB::statement('ALTER TABLE grades ADD CONSTRAINT grades_percentage_range CHECK (max_percentage >= min_percentage)');

        // Check constraint: percentages between 0 and 100
        DB::statement('ALTER TABLE grades ADD CONSTRAINT grades_min_percentage_range CHECK (min_percentage >= 0 AND min_percentage <= 100)');
        DB::statement('ALTER TABLE grades ADD CONSTRAINT grades_max_percentage_range CHECK (max_percentage >= 0 AND max_percentage <= 100)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
