<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('entity_type');
            $table->uuid('entity_id');
            $table->string('action');
            $table->json('metadata_json')->nullable();
            $table->uuid('performed_by');
            $table->timestamp('performed_at');
            $table->timestamps();

            $table->index(['school_id', 'entity_type', 'entity_id'], 'idx_cert_audit_entity');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificate_audit_logs');
    }
};
