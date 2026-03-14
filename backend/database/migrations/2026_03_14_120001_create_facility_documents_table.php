<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Documents attached to org facilities (deeds, permits, photos, etc.).
     */
    public function up(): void
    {
        Schema::create('facility_documents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('facility_id');
            $table->uuid('organization_id');
            $table->string('document_type', 50);
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('file_path');
            $table->string('file_name', 255);
            $table->string('mime_type', 100)->nullable();
            $table->unsignedInteger('file_size')->nullable();
            $table->uuid('uploaded_by')->nullable();
            $table->date('document_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('facility_id')->references('id')->on('org_facilities')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            $table->index('facility_id');
            $table->index('organization_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facility_documents');
    }
};
