<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_round_names', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('name', 100);
            $table->unsignedInteger('order_index')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');

            $table->index('organization_id');
            $table->index('school_id');
            $table->index(['organization_id', 'school_id', 'order_index'], 'attendance_round_names_org_school_order_idx');
            $table->unique(['organization_id', 'school_id', 'name', 'deleted_at'], 'attendance_round_names_unique_name');
        });

        Schema::table('attendance_sessions', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance_sessions', 'attendance_round_name_id')) {
                $table->uuid('attendance_round_name_id')->nullable()->after('round_number');
                $table->foreign('attendance_round_name_id')
                    ->references('id')
                    ->on('attendance_round_names')
                    ->onDelete('set null');
                $table->index(['organization_id', 'school_id', 'attendance_round_name_id'], 'attendance_sessions_org_school_round_name_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('attendance_sessions', 'attendance_round_name_id')) {
                $table->dropIndex('attendance_sessions_org_school_round_name_idx');
                $table->dropForeign(['attendance_round_name_id']);
                $table->dropColumn('attendance_round_name_id');
            }
        });

        Schema::dropIfExists('attendance_round_names');
    }
};

