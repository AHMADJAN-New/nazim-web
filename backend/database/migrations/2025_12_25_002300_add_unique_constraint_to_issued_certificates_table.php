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
        // Add unique constraint to prevent duplicate certificate issuance for same student in same batch
        Schema::table('issued_certificates', function (Blueprint $table) {
            $table->unique(['batch_id', 'student_id'], 'uniq_issued_cert_batch_student');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('issued_certificates', function (Blueprint $table) {
            $table->dropUnique('uniq_issued_cert_batch_student');
        });
    }
};
