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
        // Create staff table
        Schema::create('staff', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Foreign keys
            $table->uuid('profile_id')->nullable();
            $table->foreign('profile_id')->references('id')->on('profiles')->onDelete('set null');
            
            // Multi-tenancy: organization_id is required
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            // Staff identification
            $table->string('employee_id', 50);
            
            // Staff type (legacy field, kept for backward compatibility)
            $table->string('staff_type', 50)->default('teacher');
            
            // Staff type reference (new field)
            $table->uuid('staff_type_id')->nullable();
            $table->foreign('staff_type_id')->references('id')->on('staff_types')->onDelete('set null');
            
            // School reference
            $table->uuid('school_id')->nullable();
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            
            // Personal information
            $table->string('first_name', 100);
            $table->string('father_name', 100);
            $table->string('grandfather_name', 100)->nullable();
            
            // Generated full_name column (PostgreSQL generated column)
            // Note: Laravel doesn't support generated columns directly, so we'll use DB::statement
            $table->string('tazkira_number', 50)->nullable();
            $table->string('birth_year', 10)->nullable();
            $table->date('birth_date')->nullable();
            $table->string('phone_number', 20)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('home_address', 255)->nullable();
            
            // Location information
            $table->string('origin_province', 50)->nullable();
            $table->string('origin_district', 50)->nullable();
            $table->string('origin_village', 50)->nullable();
            $table->string('current_province', 50)->nullable();
            $table->string('current_district', 50)->nullable();
            $table->string('current_village', 50)->nullable();
            
            // Education information
            $table->string('religious_education', 50)->nullable();
            $table->string('religious_university', 100)->nullable();
            $table->string('religious_graduation_year', 10)->nullable();
            $table->string('religious_department', 100)->nullable();
            $table->string('modern_education', 50)->nullable();
            $table->string('modern_school_university', 100)->nullable();
            $table->string('modern_graduation_year', 10)->nullable();
            $table->string('modern_department', 100)->nullable();
            
            // Employment information
            $table->string('teaching_section', 50)->nullable();
            $table->string('position', 50)->nullable();
            $table->string('duty', 50)->nullable();
            $table->string('salary', 50)->nullable();
            $table->string('status', 50)->default('active');
            
            // Media and documents
            $table->text('picture_url')->nullable();
            $table->json('document_urls')->default('[]'); // Legacy field, kept for backward compatibility
            
            // Additional information
            $table->text('notes')->nullable();
            
            // Audit fields
            $table->uuid('created_by')->nullable();
            $table->foreign('created_by')->references('id')->on('profiles')->onDelete('set null');
            $table->uuid('updated_by')->nullable();
            $table->foreign('updated_by')->references('id')->on('profiles')->onDelete('set null');
            
            // Timestamps
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();
            
            // Unique constraints
            $table->unique(['employee_id', 'organization_id'], 'staff_employee_org_unique');
            $table->unique(['profile_id', 'organization_id'], 'staff_profile_org_unique');
            
            // Indexes
            $table->index('organization_id');
            $table->index('profile_id');
            $table->index('employee_id');
            $table->index('staff_type');
            $table->index('staff_type_id');
            $table->index('school_id');
            $table->index('status');
            $table->index('deleted_at');
        });

        // Add generated full_name column using raw SQL
        DB::statement("
            ALTER TABLE public.staff
            ADD COLUMN full_name VARCHAR(300) GENERATED ALWAYS AS (
                first_name || ' ' || father_name ||
                CASE WHEN grandfather_name IS NOT NULL THEN ' ' || grandfather_name ELSE '' END
            ) STORED;
        ");

        // Create GIN index for full_name search
        DB::statement("
            CREATE INDEX idx_staff_full_name ON public.staff USING GIN (
                to_tsvector('english', full_name)
            );
        ");

        // Add check constraints
        DB::statement("
            ALTER TABLE public.staff
            ADD CONSTRAINT staff_type_valid CHECK (staff_type IN ('teacher','admin','accountant','librarian','hostel_manager','asset_manager','security','maintenance','other'));
        ");

        DB::statement("
            ALTER TABLE public.staff
            ADD CONSTRAINT staff_status_valid CHECK (status IN ('active','inactive','on_leave','terminated','suspended'));
        ");

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_staff_updated_at
                BEFORE UPDATE ON public.staff
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.staff IS 'Comprehensive staff directory with organization isolation.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_staff_updated_at ON public.staff;');
        Schema::dropIfExists('staff');
    }
};
