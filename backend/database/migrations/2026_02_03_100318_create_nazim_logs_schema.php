<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates nazim_logs schema and activity_log table with multi-tenant support
     */
    public function up(): void
    {
        // Create nazim_logs schema
        DB::statement('CREATE SCHEMA IF NOT EXISTS nazim_logs');

        // Grant permissions to current user (application user)
        DB::statement('GRANT USAGE ON SCHEMA nazim_logs TO CURRENT_USER');
        DB::statement('GRANT CREATE ON SCHEMA nazim_logs TO CURRENT_USER');

        // Create activity_log table in nazim_logs schema
        // Using fully qualified table name: nazim_logs.activity_log
        Schema::connection('pgsql')->create('nazim_logs.activity_log', function (Blueprint $table) {
            // UUID primary key (required for all tables)
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

            // Spatie Activity Log standard columns
            $table->string('log_name')->nullable()->index();
            $table->text('description')->nullable();
            $table->string('subject_type')->nullable();
            $table->uuid('subject_id')->nullable();
            $table->string('event')->nullable();
            $table->string('causer_type')->nullable();
            $table->uuid('causer_id')->nullable();
            $table->json('properties')->nullable();
            $table->uuid('batch_uuid')->nullable()->index();

            // Multi-tenant fields
            $table->uuid('organization_id')->nullable()->index();
            $table->uuid('school_id')->nullable()->index();

            // Request context fields
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('request_method', 10)->nullable();
            $table->string('route')->nullable();
            $table->integer('status_code')->nullable();
            $table->string('session_id')->nullable();
            $table->uuid('request_id')->nullable();

            $table->timestamps();

            // Composite indexes for common queries
            $table->index(['organization_id', 'created_at'], 'idx_activity_log_org_created');
            $table->index(['school_id', 'created_at'], 'idx_activity_log_school_created');
            $table->index(['causer_id', 'created_at'], 'idx_activity_log_causer_created');
            $table->index(['subject_type', 'subject_id'], 'idx_activity_log_subject');
            $table->index(['log_name', 'created_at'], 'idx_activity_log_name_created');

            // Foreign keys (optional, can reference public schema)
            $table->foreign('organization_id', 'fk_activity_log_organization')
                ->references('id')
                ->on('public.organizations')
                ->onDelete('set null');

            $table->foreign('school_id', 'fk_activity_log_school')
                ->references('id')
                ->on('public.school_branding')
                ->onDelete('set null');
        });

        // Enable RLS on activity_log table
        // Note: In Laravel, access control is handled at application level
        // RLS is enabled for defense in depth, but Laravel enforces organization/school filtering
        DB::statement('ALTER TABLE nazim_logs.activity_log ENABLE ROW LEVEL SECURITY');

        // Create permissive policy for application access
        // Laravel controllers enforce organization/school filtering, so RLS allows all access
        // This provides defense in depth while maintaining Laravel's access control
        DB::statement('
            CREATE POLICY "Application can access activity_logs"
            ON nazim_logs.activity_log FOR ALL TO PUBLIC
            USING (true) WITH CHECK (true)
        ');

        // Note: INSERT/UPDATE/DELETE are handled by Laravel application connection
        // No direct database access for users - all writes go through Laravel
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop RLS policies
        DB::statement('DROP POLICY IF EXISTS "Application can access activity_logs" ON nazim_logs.activity_log');

        // Drop table
        Schema::connection('pgsql')->dropIfExists('nazim_logs.activity_log');

        // Drop schema (optional - may want to keep schema for other tables)
        // DB::statement('DROP SCHEMA IF EXISTS nazim_logs CASCADE');
    }
};
