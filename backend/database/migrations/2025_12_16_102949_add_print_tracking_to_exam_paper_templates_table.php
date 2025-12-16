<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_paper_templates', function (Blueprint $table) {
            // Print status tracking
            $table->enum('print_status', ['not_printed', 'printing', 'printed', 'cancelled'])->default('not_printed')->after('is_active');
            
            // Number of copies printed
            $table->integer('copies_printed')->default(0)->after('print_status');
            
            // Last printed date
            $table->timestamp('last_printed_at')->nullable()->after('copies_printed');
            
            // Printed by (user who printed)
            $table->uuid('printed_by')->nullable()->after('last_printed_at');
            $table->foreign('printed_by')->references('id')->on('profiles')->onDelete('set null');
            
            // Print notes/comments
            $table->text('print_notes')->nullable()->after('printed_by');
        });
    }

    public function down(): void
    {
        Schema::table('exam_paper_templates', function (Blueprint $table) {
            $table->dropForeign(['printed_by']);
            $table->dropColumn([
                'print_status',
                'copies_printed',
                'last_printed_at',
                'printed_by',
                'print_notes',
            ]);
        });
    }
};
