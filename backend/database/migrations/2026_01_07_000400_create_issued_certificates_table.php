<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issued_certificates', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('template_id');
            $table->uuid('batch_id')->nullable();
            $table->uuid('student_id');
            $table->string('certificate_no')->unique();
            $table->string('verification_hash')->unique();
            $table->text('qr_payload')->nullable();
            $table->uuid('issued_by');
            $table->timestamp('issued_at');
            $table->timestamp('revoked_at')->nullable();
            $table->uuid('revoked_by')->nullable();
            $table->text('revoke_reason')->nullable();
            $table->string('pdf_path')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->foreign('template_id')->references('id')->on('certificate_templates')->onDelete('cascade');
            $table->foreign('batch_id')->references('id')->on('graduation_batches')->onDelete('set null');
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');

            $table->index(['school_id', 'student_id'], 'idx_issued_certificates_student');
            $table->index('batch_id', 'idx_issued_certificates_batch');
            $table->index('issued_at', 'idx_issued_certificates_issued_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issued_certificates');
    }
};
