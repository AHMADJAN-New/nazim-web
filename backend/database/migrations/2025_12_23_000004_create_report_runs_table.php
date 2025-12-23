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
        Schema::create('report_runs', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

            // Multi-tenancy
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            // References
            $table->uuid('branding_id')->nullable();
            $table->foreign('branding_id')->references('id')->on('school_branding')->onDelete('set null');

            $table->uuid('layout_id')->nullable();
            $table->foreign('layout_id')->references('id')->on('branding_layouts')->onDelete('set null');

            $table->uuid('watermark_id')->nullable();
            $table->foreign('watermark_id')->references('id')->on('branding_watermarks')->onDelete('set null');

            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');

            // Report information
            $table->string('report_key', 100);
            $table->string('report_type', 20)->default('pdf'); // pdf, excel
            $table->string('template_name', 100)->nullable();
            $table->string('title', 255)->nullable();

            // Configuration snapshots (JSON)
            $table->jsonb('notes_snapshot')->nullable();
            $table->jsonb('page_settings')->nullable();
            $table->jsonb('parameters')->nullable();
            $table->jsonb('column_config')->nullable();

            // Output information
            $table->string('output_path', 500)->nullable();
            $table->string('file_name', 255)->nullable();
            $table->bigInteger('file_size_bytes')->nullable();

            // Status tracking
            $table->string('status', 20)->default('pending'); // pending, processing, completed, failed
            $table->integer('progress')->default(0); // 0-100
            $table->text('error_message')->nullable();
            $table->integer('duration_ms')->nullable();

            // Metadata
            $table->string('generated_by', 100)->nullable();
            $table->integer('row_count')->nullable();

            // Timestamps
            $table->timestamps();

            // Indexes
            $table->index('organization_id');
            $table->index('branding_id');
            $table->index('user_id');
            $table->index('report_key');
            $table->index('report_type');
            $table->index('status');
            $table->index('created_at');
        });

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_report_runs_updated_at
                BEFORE UPDATE ON public.report_runs
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.report_runs IS 'Logs all report generation attempts with status tracking and configuration snapshots.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_report_runs_updated_at ON public.report_runs;');
        Schema::dropIfExists('report_runs');
    }
};
