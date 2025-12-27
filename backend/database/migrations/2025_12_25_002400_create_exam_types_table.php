<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_types', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->string('name'); // e.g., "Monthly", "2 Months", "Final", "Mid-Term"
            $table->string('code')->nullable(); // e.g., "MONTHLY", "2M", "FINAL", "MID"
            $table->text('description')->nullable();
            $table->integer('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->index('organization_id');
            $table->index('is_active');
            $table->unique(['organization_id', 'code'], 'uniq_exam_types_org_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_types');
    }
};

