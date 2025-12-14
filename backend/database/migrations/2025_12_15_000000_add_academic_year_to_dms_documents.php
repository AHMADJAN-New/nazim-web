<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add academic_year_id to incoming_documents
        if (Schema::hasTable('incoming_documents') && !Schema::hasColumn('incoming_documents', 'academic_year_id')) {
            Schema::table('incoming_documents', function (Blueprint $table) {
                $table->uuid('academic_year_id')->nullable()->after('school_id');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('set null');
                $table->index('academic_year_id');
            });
        }

        // Add academic_year_id to outgoing_documents
        if (Schema::hasTable('outgoing_documents') && !Schema::hasColumn('outgoing_documents', 'academic_year_id')) {
            Schema::table('outgoing_documents', function (Blueprint $table) {
                $table->uuid('academic_year_id')->nullable()->after('school_id');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('set null');
                $table->index('academic_year_id');
            });
        }

        // Update document_sequences to use academic_year_id instead of year_key for better integration
        // Note: We keep year_key for backward compatibility, but academic_year_id is preferred
        if (Schema::hasTable('document_sequences') && !Schema::hasColumn('document_sequences', 'academic_year_id')) {
            Schema::table('document_sequences', function (Blueprint $table) {
                $table->uuid('academic_year_id')->nullable()->after('year_key');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('set null');
                $table->index('academic_year_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('incoming_documents') && Schema::hasColumn('incoming_documents', 'academic_year_id')) {
            Schema::table('incoming_documents', function (Blueprint $table) {
                $table->dropForeign(['academic_year_id']);
                $table->dropIndex(['academic_year_id']);
                $table->dropColumn('academic_year_id');
            });
        }

        if (Schema::hasTable('outgoing_documents') && Schema::hasColumn('outgoing_documents', 'academic_year_id')) {
            Schema::table('outgoing_documents', function (Blueprint $table) {
                $table->dropForeign(['academic_year_id']);
                $table->dropIndex(['academic_year_id']);
                $table->dropColumn('academic_year_id');
            });
        }

        if (Schema::hasTable('document_sequences') && Schema::hasColumn('document_sequences', 'academic_year_id')) {
            Schema::table('document_sequences', function (Blueprint $table) {
                $table->dropForeign(['academic_year_id']);
                $table->dropIndex(['academic_year_id']);
                $table->dropColumn('academic_year_id');
            });
        }
    }
};

