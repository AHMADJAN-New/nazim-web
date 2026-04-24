<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance_sessions', 'session_label')) {
                $table->string('session_label')->nullable()->after('session_date');
            }

            if (! Schema::hasColumn('attendance_sessions', 'round_number')) {
                $table->unsignedInteger('round_number')->default(1)->after('session_label');
            }
        });

        DB::statement(<<<'SQL'
            WITH ranked_sessions AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY organization_id, school_id, session_date
                        ORDER BY created_at ASC, id ASC
                    ) AS next_round_number
                FROM attendance_sessions
                WHERE deleted_at IS NULL
            )
            UPDATE attendance_sessions s
            SET round_number = ranked_sessions.next_round_number
            FROM ranked_sessions
            WHERE s.id = ranked_sessions.id
        SQL);

        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->index(
                ['organization_id', 'school_id', 'session_date', 'round_number'],
                'attendance_sessions_org_school_date_round_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropIndex('attendance_sessions_org_school_date_round_idx');

            if (Schema::hasColumn('attendance_sessions', 'round_number')) {
                $table->dropColumn('round_number');
            }

            if (Schema::hasColumn('attendance_sessions', 'session_label')) {
                $table->dropColumn('session_label');
            }
        });
    }
};
