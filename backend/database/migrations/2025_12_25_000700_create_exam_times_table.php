<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the exam_times table for exam timetable/scheduling.
     * This table tracks when and where each subject exam will be held.
     */
    public function up(): void
    {
        Schema::create('exam_times', function (Blueprint $table) {
            // UUID primary key (required for all tables)
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Organization isolation (multi-tenancy)
            $table->uuid('organization_id');
            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');
            
            // Core exam relationships
            $table->uuid('exam_id');
            $table->foreign('exam_id')
                ->references('id')
                ->on('exams')
                ->onDelete('cascade');
            
            $table->uuid('exam_class_id');
            $table->foreign('exam_class_id')
                ->references('id')
                ->on('exam_classes')
                ->onDelete('cascade');
            
            $table->uuid('exam_subject_id');
            $table->foreign('exam_subject_id')
                ->references('id')
                ->on('exam_subjects')
                ->onDelete('cascade');
            
            // Schedule details
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            
            // Optional room assignment
            $table->uuid('room_id')->nullable();
            $table->foreign('room_id')
                ->references('id')
                ->on('rooms')
                ->onDelete('set null');
            
            // Optional invigilator (staff member)
            $table->uuid('invigilator_id')->nullable();
            $table->foreign('invigilator_id')
                ->references('id')
                ->on('staff')
                ->onDelete('set null');
            
            // Additional fields
            $table->text('notes')->nullable();
            $table->boolean('is_locked')->default(false);
            
            // Timestamps and soft delete
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for performance
            $table->index('organization_id');
            $table->index('exam_id');
            $table->index('exam_class_id');
            $table->index('exam_subject_id');
            $table->index('date');
            $table->index('room_id');
            $table->index('invigilator_id');
            $table->index(['organization_id', 'exam_id', 'date']);
            $table->index('deleted_at');
        });

        // Unique constraint to prevent double-booking a subject on the same day/time
        DB::statement('
            CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_times_unique 
            ON exam_times (exam_subject_id, date, start_time, organization_id) 
            WHERE deleted_at IS NULL
        ');
        
        // Unique constraint to prevent room conflicts (same room, date, overlapping time)
        // Note: This is a partial index that prevents exact same start time in same room
        DB::statement('
            CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_times_room_unique 
            ON exam_times (room_id, date, start_time) 
            WHERE deleted_at IS NULL AND room_id IS NOT NULL
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_times');
    }
};
