<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a client-generated UUID to attendance sessions and records so that
 * offline clients (Electron desktop) can safely replay create operations
 * without producing duplicates. The (organization_id, client_uuid) pair
 * is the idempotency key: a second POST with the same pair must return
 * the existing row instead of creating a new one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance_sessions', 'client_uuid')) {
                $table->uuid('client_uuid')->nullable()->after('id');
            }
        });

        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->unique(
                ['organization_id', 'client_uuid'],
                'attendance_sessions_org_client_uuid_unique'
            );
        });

        Schema::table('attendance_records', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance_records', 'client_uuid')) {
                $table->uuid('client_uuid')->nullable()->after('id');
            }
        });

        Schema::table('attendance_records', function (Blueprint $table) {
            $table->unique(
                ['organization_id', 'client_uuid'],
                'attendance_records_org_client_uuid_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropUnique('attendance_records_org_client_uuid_unique');

            if (Schema::hasColumn('attendance_records', 'client_uuid')) {
                $table->dropColumn('client_uuid');
            }
        });

        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropUnique('attendance_sessions_org_client_uuid_unique');

            if (Schema::hasColumn('attendance_sessions', 'client_uuid')) {
                $table->dropColumn('client_uuid');
            }
        });
    }
};
