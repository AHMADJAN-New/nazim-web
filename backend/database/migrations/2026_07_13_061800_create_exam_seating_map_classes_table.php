<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_seating_map_classes', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('exam_seating_map_id');
            $table->uuid('exam_class_id');
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('school_id')->references('id')->on('school_branding')->cascadeOnDelete();
            $table->foreign(
                ['exam_seating_map_id', 'organization_id', 'school_id'],
                'exam_seating_map_classes_map_tenant_fk'
            )->references(
                ['id', 'organization_id', 'school_id']
            )->on('exam_seating_maps')->cascadeOnDelete();
            $table->foreign(
                ['exam_class_id', 'organization_id', 'school_id'],
                'exam_seating_map_classes_class_tenant_fk'
            )->references(
                ['id', 'organization_id', 'school_id']
            )->on('exam_classes')->cascadeOnDelete();

            $table->index('organization_id', 'idx_exam_seating_map_classes_org');
            $table->index('school_id', 'idx_exam_seating_map_classes_school');
            $table->index('exam_seating_map_id', 'idx_exam_seating_map_classes_map');
            $table->index('exam_class_id', 'idx_exam_seating_map_classes_class');
            $table->index('deleted_at', 'idx_exam_seating_map_classes_deleted');
        });

        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX exam_seating_map_classes_live_unique
            ON public.exam_seating_map_classes (exam_seating_map_id, exam_class_id)
            WHERE deleted_at IS NULL
        SQL);

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.validate_exam_seating_map_class_exam()
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
                        AND seating_map.deleted_at IS NULL
                        AND exam_class.deleted_at IS NULL
                ) THEN
                    RAISE EXCEPTION 'Seating map and exam class must belong to the same exam and tenant';
                END IF;

                RETURN NEW;
            END;
            $$
        SQL);

        DB::statement(<<<'SQL'
            CREATE TRIGGER validate_exam_seating_map_class_exam
            BEFORE INSERT OR UPDATE ON public.exam_seating_map_classes
            FOR EACH ROW
            EXECUTE FUNCTION public.validate_exam_seating_map_class_exam()
        SQL);

        // Backfill: existing maps get all exam classes for their exam.
        DB::statement(<<<'SQL'
            INSERT INTO public.exam_seating_map_classes (
                id,
                organization_id,
                school_id,
                exam_seating_map_id,
                exam_class_id,
                created_at,
                updated_at
            )
            SELECT
                gen_random_uuid(),
                seating_map.organization_id,
                seating_map.school_id,
                seating_map.id,
                exam_class.id,
                NOW(),
                NOW()
            FROM public.exam_seating_maps AS seating_map
            INNER JOIN public.exam_classes AS exam_class
                ON exam_class.exam_id = seating_map.exam_id
                AND exam_class.organization_id = seating_map.organization_id
                AND exam_class.school_id = seating_map.school_id
            WHERE seating_map.deleted_at IS NULL
                AND exam_class.deleted_at IS NULL
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS validate_exam_seating_map_class_exam ON public.exam_seating_map_classes');
        DB::statement('DROP FUNCTION IF EXISTS public.validate_exam_seating_map_class_exam()');
        Schema::dropIfExists('exam_seating_map_classes');
    }
};
