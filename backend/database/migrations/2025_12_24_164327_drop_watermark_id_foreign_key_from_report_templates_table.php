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
        // Check if the foreign key constraint exists before trying to drop it
        // The previous migration (163420) explicitly did NOT create a foreign key,
        // so this migration may be unnecessary, but we'll handle it gracefully
        $constraintName = 'report_templates_watermark_id_foreign';
        
        $constraintExists = DB::selectOne("
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name = ? 
            AND table_name = 'report_templates'
            AND constraint_type = 'FOREIGN KEY'
        ", [$constraintName]);

        if ($constraintExists) {
            Schema::table('report_templates', function (Blueprint $table) use ($constraintName) {
                // Drop the foreign key constraint to allow sentinel UUID '00000000-0000-0000-0000-000000000000'
                // for "no watermark" option
                // Validation is handled in the application layer
                $table->dropForeign([$constraintName]);
            });
        }
        // If constraint doesn't exist, migration is already in desired state - no action needed
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Check if foreign key already exists before trying to add it
        $constraintName = 'report_templates_watermark_id_foreign';
        
        $constraintExists = DB::selectOne("
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name = ? 
            AND table_name = 'report_templates'
            AND constraint_type = 'FOREIGN KEY'
        ", [$constraintName]);

        if (!$constraintExists) {
            Schema::table('report_templates', function (Blueprint $table) {
                // Re-add the foreign key constraint (if needed for rollback)
                $table->foreign('watermark_id')
                    ->references('id')
                    ->on('branding_watermarks')
                    ->onDelete('set null');
            });
        }
    }
};
