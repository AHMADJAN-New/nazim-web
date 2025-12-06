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
        Schema::create('short_term_courses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->string('name');
            $table->string('name_en')->nullable();
            $table->string('name_ar')->nullable();
            $table->string('name_ps')->nullable();
            $table->string('name_fa')->nullable();
            $table->text('description')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->integer('duration_days')->nullable();
            $table->integer('max_students')->nullable();
            $table->enum('status', ['draft', 'open', 'closed', 'completed'])->default('draft')->index();
            $table->decimal('fee_amount', 10, 2)->nullable();
            $table->string('instructor_name')->nullable();
            $table->string('location')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->uuid('closed_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('short_term_courses');
    }
};
