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
        Schema::create('school_admission_rules', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Multi-tenancy: organization_id is required
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            // School reference (unique - one rule set per school)
            $table->uuid('school_id')->unique();
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            
            // Commitment items as JSONB array of strings
            $table->jsonb('commitment_items')->default('[]');
            
            // Guarantee text
            $table->text('guarantee_text')->nullable();
            
            // Timestamps
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();
            
            // Indexes
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('deleted_at');
        });

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_school_admission_rules_updated_at
                BEFORE UPDATE ON public.school_admission_rules
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.school_admission_rules IS 'School admission rules (شرائط و تعهدات) - commitment items and guarantee text per school.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_school_admission_rules_updated_at ON public.school_admission_rules;');
        Schema::dropIfExists('school_admission_rules');
    }
};
