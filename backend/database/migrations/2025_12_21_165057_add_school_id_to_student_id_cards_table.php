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
        Schema::table('student_id_cards', function (Blueprint $table) {
            // Add school_id column (nullable, as some cards might not have a school)
            $table->uuid('school_id')->nullable()->after('organization_id');
            
            // Add foreign key if school_branding table exists
            if (Schema::hasTable('school_branding')) {
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            }
            
            // Add index for performance
            $table->index('school_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_id_cards', function (Blueprint $table) {
            // Drop foreign key first
            if (Schema::hasTable('school_branding')) {
                $table->dropForeign(['school_id']);
            }
            
            // Drop index
            $table->dropIndex(['school_id']);
            
            // Drop column
            $table->dropColumn('school_id');
        });
    }
};
