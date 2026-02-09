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
        Schema::table('school_admission_rules', function (Blueprint $table) {
            $table->jsonb('labels')->nullable()->after('guarantee_text');
        });

        DB::statement("
            COMMENT ON COLUMN public.school_admission_rules.labels IS 'Section labels for rules page (e.g. commitments_title, guarantee_title) - used in student profile PDF.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_admission_rules', function (Blueprint $table) {
            $table->dropColumn('labels');
        });
    }
};
