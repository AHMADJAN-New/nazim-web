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
        Schema::create('branding_notes', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

            // Multi-tenancy
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            // School branding reference
            $table->uuid('branding_id');
            $table->foreign('branding_id')->references('id')->on('school_branding')->onDelete('cascade');

            // Report key (optional - null means all reports)
            $table->string('report_key', 100)->nullable();

            // Note content
            $table->text('note_text');
            $table->string('language', 20)->nullable(); // pashto, dari, english
            $table->string('location', 20)->default('footer'); // header, body, footer
            $table->string('show_on', 20)->default('all'); // all, pdf, excel
            $table->integer('sort_order')->default(0);

            // Status
            $table->boolean('is_active')->default(true);

            // Timestamps
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            // Indexes
            $table->index('organization_id');
            $table->index('branding_id');
            $table->index('report_key');
            $table->index('location');
            $table->index('is_active');
            $table->index('deleted_at');
        });

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_branding_notes_updated_at
                BEFORE UPDATE ON public.branding_notes
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.branding_notes IS 'Customizable notes for report headers, bodies, and footers.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_branding_notes_updated_at ON public.branding_notes;');
        Schema::dropIfExists('branding_notes');
    }
};
