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
        if (!Schema::hasTable('fee_structures')) {
            Schema::create('fee_structures', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->uuid('academic_year_id');
                $table->uuid('class_id')->nullable();
                $table->uuid('class_academic_year_id')->nullable();
                $table->string('name', 255);
                $table->string('code', 50)->nullable();
                $table->text('description')->nullable();
                $table->enum('fee_type', ['one_time', 'monthly', 'quarterly', 'semester', 'annual', 'custom']);
                $table->decimal('amount', 15, 2);
                $table->uuid('currency_id')->nullable();
                $table->date('due_date')->nullable();
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->boolean('is_active')->default(true);
                $table->boolean('is_required')->default(true);
                $table->integer('display_order')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('cascade');
                $table->foreign('class_id')->references('id')->on('classes')->onDelete('cascade');
                $table->foreign('class_academic_year_id')->references('id')->on('class_academic_years')->onDelete('cascade');
                $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('set null');

                $table->index('organization_id');
                $table->index('school_id');
                $table->index('academic_year_id');
                $table->index('class_id');
                $table->index('class_academic_year_id');
                $table->index('is_active');
                $table->index('deleted_at');
            });

            DB::statement('
                CREATE UNIQUE INDEX fee_structures_org_code_unique
                ON fee_structures (organization_id, code)
                WHERE code IS NOT NULL AND deleted_at IS NULL
            ');
        }
    }

    /**
    * Reverse the migrations.
    */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS fee_structures_org_code_unique');
        Schema::dropIfExists('fee_structures');
    }
};

