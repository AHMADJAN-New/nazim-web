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
        if (Schema::hasTable('exam_attendances')) {
            return;
        }

        Schema::create('exam_attendances', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('exam_id');
            $table->uuid('exam_time_id');
            $table->uuid('exam_class_id');
            $table->uuid('exam_subject_id');
            $table->uuid('student_id');
            
            // Status: present, absent, late, excused
            $table->string('status', 20)->default('present');
            
            // When attendance was marked/scanned
            $table->timestamp('checked_in_at')->nullable();
            
            // Optional seat plan support
            $table->string('seat_number', 50)->nullable();
            
            // Additional notes
            $table->text('notes')->nullable();
            
            // Timestamps and soft deletes
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');
                
            $table->foreign('exam_id')
                ->references('id')
                ->on('exams')
                ->onDelete('cascade');
                
            $table->foreign('exam_time_id')
                ->references('id')
                ->on('exam_times')
                ->onDelete('cascade');
                
            $table->foreign('exam_class_id')
                ->references('id')
                ->on('exam_classes')
                ->onDelete('cascade');
                
            $table->foreign('exam_subject_id')
                ->references('id')
                ->on('exam_subjects')
                ->onDelete('cascade');
                
            $table->foreign('student_id')
                ->references('id')
                ->on('students')
                ->onDelete('cascade');

            // Indexes
            $table->index('organization_id');
            $table->index('exam_id');
            $table->index('exam_time_id');
            $table->index('exam_class_id');
            $table->index('exam_subject_id');
            $table->index('student_id');
            $table->index('status');
            $table->index('deleted_at');
            
            // Composite indexes for reporting
            $table->index(['organization_id', 'exam_id', 'exam_class_id', 'exam_subject_id'], 'idx_exam_attendance_reporting');
        });

        // Unique constraint to prevent duplicate attendance per timeslot
        DB::statement('
            CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_attendances_unique 
            ON exam_attendances (organization_id, exam_time_id, student_id) 
            WHERE deleted_at IS NULL
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_attendances');
    }
};
