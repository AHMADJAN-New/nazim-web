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
        // Skip if table already exists (created via Supabase migrations)
        if (Schema::hasTable('student_documents')) {
            return;
        }

        Schema::create('student_documents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('student_id');
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->string('document_type', 100);
            $table->string('file_name', 255);
            $table->text('file_path');
            $table->bigInteger('file_size')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->text('description')->nullable();
            $table->uuid('uploaded_by')->nullable();
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            $table->foreign('uploaded_by')->references('id')->on('profiles')->onDelete('set null');

            // Indexes
            $table->index('student_id', 'idx_student_documents_student_id');
            $table->index('organization_id', 'idx_student_documents_organization_id');
            $table->index('school_id', 'idx_student_documents_school_id');
        });

        // Add partial indexes
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_documents_document_type ON student_documents (document_type) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_documents_deleted_at ON student_documents (deleted_at) WHERE deleted_at IS NULL');

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_student_documents_updated_at
                BEFORE UPDATE ON student_documents
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_student_documents_updated_at ON student_documents');
        Schema::dropIfExists('student_documents');
    }
};

