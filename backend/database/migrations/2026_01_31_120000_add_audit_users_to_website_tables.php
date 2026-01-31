<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addAuditColumns('website_announcements');
        $this->addAuditColumns('website_events');
        $this->addAuditColumns('website_media');
        $this->addAuditColumns('website_media_categories');
        $this->addAuditColumns('website_menu_links');
        $this->addAuditColumns('website_domains');
    }

    public function down(): void
    {
        $this->dropAuditColumns('website_domains');
        $this->dropAuditColumns('website_menu_links');
        $this->dropAuditColumns('website_media_categories');
        $this->dropAuditColumns('website_media');
        $this->dropAuditColumns('website_events');
        $this->dropAuditColumns('website_announcements');
    }

    private function addAuditColumns(string $tableName): void
    {
        if (!Schema::hasTable($tableName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($tableName) {
            if (!Schema::hasColumn($tableName, 'created_by')) {
                $table->uuid('created_by')->nullable();
                $table->foreign('created_by')->references('id')->on('profiles')->onDelete('set null');
                $table->index('created_by', 'idx_' . $tableName . '_created_by');
            }
            if (!Schema::hasColumn($tableName, 'updated_by')) {
                $table->uuid('updated_by')->nullable();
                $table->foreign('updated_by')->references('id')->on('profiles')->onDelete('set null');
                $table->index('updated_by', 'idx_' . $tableName . '_updated_by');
            }
        });
    }

    private function dropAuditColumns(string $tableName): void
    {
        if (!Schema::hasTable($tableName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($tableName) {
            if (Schema::hasColumn($tableName, 'created_by')) {
                $table->dropForeign($tableName . '_created_by_foreign');
                $table->dropIndex('idx_' . $tableName . '_created_by');
                $table->dropColumn('created_by');
            }
            if (Schema::hasColumn($tableName, 'updated_by')) {
                $table->dropForeign($tableName . '_updated_by_foreign');
                $table->dropIndex('idx_' . $tableName . '_updated_by');
                $table->dropColumn('updated_by');
            }
        });
    }
};
