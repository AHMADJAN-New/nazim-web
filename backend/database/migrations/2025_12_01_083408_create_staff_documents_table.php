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
        // Create staff_documents table
        Schema::create('staff_documents', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Foreign keys
            $table->uuid('staff_id');
            $table->foreign('staff_id')->references('id')->on('staff')->onDelete('cascade');
            
            // Multi-tenancy: organization_id is required
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            // School reference (optional)
            $table->uuid('school_id')->nullable();
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            
            // Document information
            $table->string('document_type', 100);
            $table->string('file_name', 255);
            $table->text('file_path');
            $table->bigInteger('file_size')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->text('description')->nullable();
            
            // Audit field
            $table->uuid('uploaded_by')->nullable();
            $table->foreign('uploaded_by')->references('id')->on('profiles')->onDelete('set null');
            
            // Timestamps
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();
            
            // Indexes
            $table->index('staff_id');
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('document_type');
            $table->index('deleted_at');
        });

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_staff_documents_updated_at
                BEFORE UPDATE ON public.staff_documents
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Create function to auto-set organization_id from staff
        DB::statement("
            CREATE OR REPLACE FUNCTION public.auto_set_staff_document_organization_id()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            SET search_path = public
            AS $$
            BEGIN
                IF NEW.organization_id IS NULL THEN
                    SELECT organization_id INTO NEW.organization_id
                    FROM public.staff
                    WHERE id = NEW.staff_id AND deleted_at IS NULL;
                END IF;
                RETURN NEW;
            END;
            $$;
        ");

        // Create trigger to auto-set organization_id
        DB::statement("
            CREATE TRIGGER auto_set_staff_document_organization_id_trigger
                BEFORE INSERT OR UPDATE ON public.staff_documents
                FOR EACH ROW
                WHEN (NEW.organization_id IS NULL)
                EXECUTE FUNCTION public.auto_set_staff_document_organization_id();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.staff_documents IS 'Staff documents with organization and school-based folder structure. Replaces JSONB document_urls array.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS auto_set_staff_document_organization_id_trigger ON public.staff_documents;');
        DB::statement('DROP TRIGGER IF EXISTS update_staff_documents_updated_at ON public.staff_documents;');
        DB::statement('DROP FUNCTION IF EXISTS public.auto_set_staff_document_organization_id();');
        Schema::dropIfExists('staff_documents');
    }
};
