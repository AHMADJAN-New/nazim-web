<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX exams_seating_tenant_key_unique
            ON public.exams (id, organization_id, school_id)
        SQL);
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX exam_students_seating_tenant_key_unique
            ON public.exam_students (id, exam_id, organization_id, school_id)
        SQL);
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX exam_classes_seating_tenant_key_unique
            ON public.exam_classes (id, exam_id, organization_id, school_id)
        SQL);
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX exam_classes_seating_scope_key_unique
            ON public.exam_classes (id, organization_id, school_id)
        SQL);
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS rooms_scope_key_unique
            ON public.rooms (id, school_id)
        SQL);

        Schema::create('exam_seating_maps', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('exam_id');
            $table->uuid('room_id')->nullable();
            $table->string('name');
            $table->unsignedSmallInteger('rows');
            $table->unsignedSmallInteger('columns');
            $table->unsignedInteger('start_seat_number')->default(1);
            $table->string('status', 30)->default('draft');
            $table->unsignedInteger('revision')->default(1);
            $table->char('input_checksum', 64)->nullable();
            $table->string('solver_status', 30)->default('not_run');
            $table->jsonb('solver_diagnostics')->nullable();
            $table->timestampTz('applied_at')->nullable();
            $table->uuid('applied_by')->nullable();
            $table->timestampTz('finalized_at')->nullable();
            $table->uuid('finalized_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('school_id')->references('id')->on('school_branding')->cascadeOnDelete();
            $table->foreign(
                ['exam_id', 'organization_id', 'school_id'],
                'exam_seating_maps_exam_tenant_fk'
            )->references(['id', 'organization_id', 'school_id'])->on('exams')->cascadeOnDelete();
            $table->foreign(
                ['room_id', 'school_id'],
                'exam_seating_maps_room_school_fk'
            )->references(['id', 'school_id'])->on('rooms')->nullOnDelete();
            $table->foreign('applied_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('finalized_by')->references('id')->on('users')->nullOnDelete();

            $table->index('organization_id', 'idx_exam_seating_maps_org');
            $table->index('school_id', 'idx_exam_seating_maps_school');
            $table->index('exam_id', 'idx_exam_seating_maps_exam');
            $table->index('room_id', 'idx_exam_seating_maps_room');
            $table->index(['exam_id', 'status'], 'idx_exam_seating_maps_exam_status');
            $table->index('deleted_at', 'idx_exam_seating_maps_deleted');
            $table->unique(
                ['id', 'exam_id', 'organization_id', 'school_id'],
                'exam_seating_maps_tenant_key_unique'
            );
            $table->unique(
                ['id', 'organization_id', 'school_id'],
                'exam_seating_maps_scope_key_unique'
            );
        });

        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seating_maps
            ADD CONSTRAINT exam_seating_maps_dimensions_check
            CHECK (rows > 0 AND columns > 0 AND start_seat_number > 0 AND revision > 0)
        SQL);
        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seating_maps
            ADD CONSTRAINT exam_seating_maps_status_check
            CHECK (status IN ('draft', 'generated', 'applied', 'finalized'))
        SQL);
        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seating_maps
            ADD CONSTRAINT exam_seating_maps_solver_status_check
            CHECK (solver_status IN ('not_run', 'pending', 'running', 'succeeded', 'failed'))
        SQL);

        Schema::create('exam_seat_assignments', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('exam_seating_map_id');
            $table->uuid('exam_id');
            $table->uuid('exam_student_id')->nullable();
            $table->unsignedSmallInteger('row_number');
            $table->unsignedSmallInteger('column_number');
            $table->unsignedInteger('seat_number');
            $table->boolean('is_locked')->default(false);
            $table->boolean('is_disabled')->default(false);
            $table->timestampTz('locked_at')->nullable();
            $table->uuid('locked_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('school_id')->references('id')->on('school_branding')->cascadeOnDelete();
            $table->foreign(
                ['exam_seating_map_id', 'exam_id', 'organization_id', 'school_id'],
                'exam_seat_assignments_map_tenant_fk'
            )->references(
                ['id', 'exam_id', 'organization_id', 'school_id']
            )->on('exam_seating_maps')->cascadeOnDelete();
            $table->foreign(
                ['exam_student_id', 'exam_id', 'organization_id', 'school_id'],
                'exam_seat_assignments_student_tenant_fk'
            )->references(
                ['id', 'exam_id', 'organization_id', 'school_id']
            )->on('exam_students')->cascadeOnDelete();
            $table->foreign('locked_by')->references('id')->on('users')->nullOnDelete();

            $table->index('organization_id', 'idx_exam_seat_assignments_org');
            $table->index('school_id', 'idx_exam_seat_assignments_school');
            $table->index('exam_seating_map_id', 'idx_exam_seat_assignments_map');
            $table->index('exam_id', 'idx_exam_seat_assignments_exam');
            $table->index('exam_student_id', 'idx_exam_seat_assignments_student');
            $table->index('deleted_at', 'idx_exam_seat_assignments_deleted');
        });

        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seat_assignments
            ADD CONSTRAINT exam_seat_assignments_position_check
            CHECK (row_number > 0 AND column_number > 0 AND seat_number > 0)
        SQL);
        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seat_assignments
            ADD CONSTRAINT exam_seat_assignments_disabled_check
            CHECK (
                (is_disabled = true AND exam_student_id IS NULL)
                OR (is_disabled = false AND exam_student_id IS NOT NULL)
            )
        SQL);
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX exam_seat_assignments_live_coordinate_unique
            ON public.exam_seat_assignments (exam_seating_map_id, row_number, column_number)
            WHERE deleted_at IS NULL
        SQL);
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX exam_seat_assignments_live_student_unique
            ON public.exam_seat_assignments (exam_id, exam_student_id)
            WHERE deleted_at IS NULL AND exam_student_id IS NOT NULL
        SQL);
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX exam_seat_assignments_live_number_unique
            ON public.exam_seat_assignments (exam_id, seat_number)
            WHERE deleted_at IS NULL
        SQL);

        Schema::create('exam_seating_class_colors', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('exam_seating_map_id');
            $table->uuid('exam_class_id');
            $table->string('color_hex', 7);
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('school_id')->references('id')->on('school_branding')->cascadeOnDelete();
            $table->foreign(
                ['exam_seating_map_id', 'organization_id', 'school_id'],
                'exam_seating_colors_map_tenant_fk'
            )->references(
                ['id', 'organization_id', 'school_id']
            )->on('exam_seating_maps')->cascadeOnDelete();
            $table->foreign(
                ['exam_class_id', 'organization_id', 'school_id'],
                'exam_seating_colors_class_tenant_fk'
            )->references(
                ['id', 'organization_id', 'school_id']
            )->on('exam_classes')->cascadeOnDelete();

            $table->index('organization_id', 'idx_exam_seating_colors_org');
            $table->index('school_id', 'idx_exam_seating_colors_school');
            $table->index('exam_seating_map_id', 'idx_exam_seating_colors_map');
            $table->index('exam_class_id', 'idx_exam_seating_colors_class');
            $table->index('deleted_at', 'idx_exam_seating_colors_deleted');
        });

        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seating_class_colors
            ADD CONSTRAINT exam_seating_class_colors_hex_check
            CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$')
        SQL);
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX exam_seating_colors_live_map_class_unique
            ON public.exam_seating_class_colors (exam_seating_map_id, exam_class_id)
            WHERE deleted_at IS NULL
        SQL);
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.validate_exam_seating_class_color_exam()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            SET search_path = public
            AS $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM public.exam_seating_maps AS seating_map
                    INNER JOIN public.exam_classes AS exam_class
                        ON exam_class.exam_id = seating_map.exam_id
                    WHERE seating_map.id = NEW.exam_seating_map_id
                        AND exam_class.id = NEW.exam_class_id
                        AND seating_map.organization_id = NEW.organization_id
                        AND seating_map.school_id = NEW.school_id
                        AND exam_class.organization_id = NEW.organization_id
                        AND exam_class.school_id = NEW.school_id
                ) THEN
                    RAISE EXCEPTION 'Seating map and exam class must belong to the same exam and tenant';
                END IF;

                RETURN NEW;
            END;
            $$
        SQL);
        DB::statement(<<<'SQL'
            CREATE TRIGGER validate_exam_seating_class_color_exam
            BEFORE INSERT OR UPDATE ON public.exam_seating_class_colors
            FOR EACH ROW
            EXECUTE FUNCTION public.validate_exam_seating_class_color_exam()
        SQL);

        Schema::create('exam_seating_runs', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('exam_seating_map_id');
            $table->uuid('exam_id');
            $table->unsignedInteger('revision');
            $table->char('input_checksum', 64);
            $table->string('algorithm_version', 100);
            $table->string('idempotency_key', 255);
            $table->string('status', 30)->default('pending');
            $table->bigInteger('seed')->nullable();
            $table->unsignedInteger('conflict_count')->default(0);
            $table->jsonb('diagnostics')->nullable();
            $table->text('error_message')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('failed_at')->nullable();
            $table->timestampsTz();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('school_id')->references('id')->on('school_branding')->cascadeOnDelete();
            $table->foreign(
                ['exam_seating_map_id', 'exam_id', 'organization_id', 'school_id'],
                'exam_seating_runs_map_tenant_fk'
            )->references(
                ['id', 'exam_id', 'organization_id', 'school_id']
            )->on('exam_seating_maps')->restrictOnDelete();

            $table->unique(
                ['organization_id', 'idempotency_key'],
                'exam_seating_runs_org_idempotency_unique'
            );
            $table->index('organization_id', 'idx_exam_seating_runs_org');
            $table->index('school_id', 'idx_exam_seating_runs_school');
            $table->index('exam_seating_map_id', 'idx_exam_seating_runs_map');
            $table->index('exam_id', 'idx_exam_seating_runs_exam');
            $table->index(['exam_seating_map_id', 'revision'], 'idx_exam_seating_runs_map_revision');
            $table->index(['status', 'created_at'], 'idx_exam_seating_runs_status_created');
        });

        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seating_runs
            ADD CONSTRAINT exam_seating_runs_revision_check
            CHECK (revision > 0)
        SQL);
        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seating_runs
            ADD CONSTRAINT exam_seating_runs_status_check
            CHECK (status IN ('pending', 'running', 'succeeded', 'failed'))
        SQL);
        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seating_runs
            ADD CONSTRAINT exam_seating_runs_values_check
            CHECK (
                conflict_count >= 0
                AND input_checksum ~ '^[0-9A-Fa-f]{64}$'
                AND length(trim(algorithm_version)) > 0
                AND length(trim(idempotency_key)) > 0
            )
        SQL);

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.reject_exam_seating_run_mutation()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            SET search_path = public
            AS $$
            BEGIN
                RAISE EXCEPTION 'Exam seating runs are immutable after creation';
            END;
            $$
        SQL);
        DB::statement(<<<'SQL'
            CREATE TRIGGER reject_exam_seating_run_update
            BEFORE UPDATE ON public.exam_seating_runs
            FOR EACH ROW
            EXECUTE FUNCTION public.reject_exam_seating_run_mutation()
        SQL);
        DB::statement(<<<'SQL'
            CREATE TRIGGER reject_exam_seating_run_delete
            BEFORE DELETE ON public.exam_seating_runs
            FOR EACH ROW
            EXECUTE FUNCTION public.reject_exam_seating_run_mutation()
        SQL);

        $this->enableOrganizationIsolationPolicies();
    }

    public function down(): void
    {
        $this->dropOrganizationIsolationPolicies();

        DB::statement('DROP TRIGGER IF EXISTS reject_exam_seating_run_delete ON public.exam_seating_runs');
        DB::statement('DROP TRIGGER IF EXISTS reject_exam_seating_run_update ON public.exam_seating_runs');
        DB::statement('DROP FUNCTION IF EXISTS public.reject_exam_seating_run_mutation()');
        DB::statement('DROP TRIGGER IF EXISTS validate_exam_seating_class_color_exam ON public.exam_seating_class_colors');
        DB::statement('DROP FUNCTION IF EXISTS public.validate_exam_seating_class_color_exam()');

        Schema::dropIfExists('exam_seating_runs');
        Schema::dropIfExists('exam_seating_class_colors');
        Schema::dropIfExists('exam_seat_assignments');
        Schema::dropIfExists('exam_seating_maps');
        DB::statement('DROP INDEX IF EXISTS public.exam_classes_seating_tenant_key_unique');
        DB::statement('DROP INDEX IF EXISTS public.exam_classes_seating_scope_key_unique');
        DB::statement('DROP INDEX IF EXISTS public.exam_students_seating_tenant_key_unique');
        DB::statement('DROP INDEX IF EXISTS public.exams_seating_tenant_key_unique');
        DB::statement('DROP INDEX IF EXISTS public.rooms_scope_key_unique');
    }

    private function enableOrganizationIsolationPolicies(): void
    {
        DB::statement(<<<'SQL'
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                    CREATE ROLE authenticated;
                END IF;
            END
            $$
        SQL);

        $tables = [
            'exam_seating_maps' => 'Org isolation seating maps',
            'exam_seat_assignments' => 'Org isolation seat assignments',
            'exam_seating_class_colors' => 'Org isolation seating colors',
            'exam_seating_runs' => 'Org isolation seating runs',
        ];

        foreach ($tables as $table => $policyName) {
            DB::statement("ALTER TABLE public.{$table} ENABLE ROW LEVEL SECURITY");
            DB::statement(<<<SQL
                CREATE POLICY "{$policyName}"
                ON public.{$table}
                FOR ALL
                TO authenticated
                USING (
                    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
                )
                WITH CHECK (
                    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
                )
            SQL);
        }
    }

    private function dropOrganizationIsolationPolicies(): void
    {
        $policies = [
            'exam_seating_maps' => 'Org isolation seating maps',
            'exam_seat_assignments' => 'Org isolation seat assignments',
            'exam_seating_class_colors' => 'Org isolation seating colors',
            'exam_seating_runs' => 'Org isolation seating runs',
        ];

        foreach ($policies as $table => $policyName) {
            DB::statement("DROP POLICY IF EXISTS \"{$policyName}\" ON public.{$table}");
        }
    }
};
