<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add content/description and pages_count to incoming_documents
        if (Schema::hasTable('incoming_documents')) {
            Schema::table('incoming_documents', function (Blueprint $table) {
                if (!Schema::hasColumn('incoming_documents', 'description')) {
                    $table->longText('description')->nullable()->after('subject');
                }
                if (!Schema::hasColumn('incoming_documents', 'pages_count')) {
                    $table->unsignedInteger('pages_count')->nullable()->after('description');
                }
                if (!Schema::hasColumn('incoming_documents', 'attachments_count')) {
                    $table->unsignedInteger('attachments_count')->default(0)->after('pages_count');
                }
            });
        }

        // Add content/description and pages_count to outgoing_documents
        if (Schema::hasTable('outgoing_documents')) {
            Schema::table('outgoing_documents', function (Blueprint $table) {
                if (!Schema::hasColumn('outgoing_documents', 'description')) {
                    $table->longText('description')->nullable()->after('subject');
                }
                if (!Schema::hasColumn('outgoing_documents', 'pages_count')) {
                    $table->unsignedInteger('pages_count')->nullable()->after('description');
                }
                if (!Schema::hasColumn('outgoing_documents', 'attachments_count')) {
                    $table->unsignedInteger('attachments_count')->default(0)->after('pages_count');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('incoming_documents')) {
            Schema::table('incoming_documents', function (Blueprint $table) {
                if (Schema::hasColumn('incoming_documents', 'attachments_count')) {
                    $table->dropColumn('attachments_count');
                }
                if (Schema::hasColumn('incoming_documents', 'pages_count')) {
                    $table->dropColumn('pages_count');
                }
                if (Schema::hasColumn('incoming_documents', 'description')) {
                    $table->dropColumn('description');
                }
            });
        }

        if (Schema::hasTable('outgoing_documents')) {
            Schema::table('outgoing_documents', function (Blueprint $table) {
                if (Schema::hasColumn('outgoing_documents', 'attachments_count')) {
                    $table->dropColumn('attachments_count');
                }
                if (Schema::hasColumn('outgoing_documents', 'pages_count')) {
                    $table->dropColumn('pages_count');
                }
                if (Schema::hasColumn('outgoing_documents', 'description')) {
                    $table->dropColumn('description');
                }
            });
        }
    }
};

