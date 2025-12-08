<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('exams')) {
            Schema::create('exams', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->uuid('academic_year_id');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('cascade');
                $table->string('name');
                $table->text('description')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index('organization_id');
                $table->index('academic_year_id');
                $table->index('deleted_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
