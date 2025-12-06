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
        Schema::create('attendance_session_classes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('attendance_session_id');
            $table->uuid('class_id');
            $table->uuid('organization_id');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('attendance_session_id')->references('id')->on('attendance_sessions')->onDelete('cascade');
            $table->foreign('class_id')->references('id')->on('classes')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            $table->unique(['attendance_session_id', 'class_id', 'deleted_at'], 'attendance_session_classes_unique');
            $table->index(['attendance_session_id'], 'attendance_session_classes_session_idx');
            $table->index(['class_id'], 'attendance_session_classes_class_idx');
            $table->index(['organization_id'], 'attendance_session_classes_org_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_session_classes');
    }
};
