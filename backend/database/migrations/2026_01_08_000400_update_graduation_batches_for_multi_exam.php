<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('graduation_batches', function (Blueprint $table) {
            // Keep exam_id for backward compatibility - will be removed later
            // Add graduation type
            $table->enum('graduation_type', ['final_year', 'promotion', 'transfer'])
                ->default('final_year')
                ->after('status');

            // Add class transfer fields
            $table->uuid('from_class_id')->nullable()->after('class_id');
            $table->uuid('to_class_id')->nullable()->after('from_class_id');

            // Add attendance requirements
            $table->decimal('min_attendance_percentage', 5, 2)->nullable()->default(75.00);
            $table->boolean('require_attendance')->default(true);
            $table->boolean('exclude_approved_leaves')->default(true);

            // Foreign keys for class transfers
            $table->foreign('from_class_id')->references('id')->on('classes')->onDelete('set null');
            $table->foreign('to_class_id')->references('id')->on('classes')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('graduation_batches', function (Blueprint $table) {
            $table->dropForeign(['from_class_id']);
            $table->dropForeign(['to_class_id']);
            $table->dropColumn([
                'graduation_type',
                'from_class_id',
                'to_class_id',
                'min_attendance_percentage',
                'require_attendance',
                'exclude_approved_leaves',
            ]);
        });
    }
};

