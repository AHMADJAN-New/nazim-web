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
        if (!Schema::hasTable('fee_assignments')) {
            Schema::create('fee_assignments', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->uuid('student_id');
                $table->uuid('student_admission_id');
                $table->uuid('fee_structure_id');
                $table->uuid('academic_year_id');
                $table->uuid('class_academic_year_id')->nullable();
                $table->decimal('original_amount', 15, 2);
                $table->decimal('assigned_amount', 15, 2);
                $table->uuid('currency_id')->nullable();
                $table->enum('exception_type', ['none', 'discount_percentage', 'discount_fixed', 'waiver', 'custom'])->default('none');
                $table->decimal('exception_amount', 15, 2)->default(0);
                $table->text('exception_reason')->nullable();
                $table->uuid('exception_approved_by')->nullable();
                $table->timestampTz('exception_approved_at')->nullable();
                $table->date('payment_period_start')->nullable();
                $table->date('payment_period_end')->nullable();
                $table->date('due_date');
                $table->enum('status', ['pending', 'partial', 'paid', 'overdue', 'waived', 'cancelled'])->default('pending');
                $table->decimal('paid_amount', 15, 2)->default(0);
                $table->decimal('remaining_amount', 15, 2);
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
                $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
                $table->foreign('student_admission_id')->references('id')->on('student_admissions')->onDelete('cascade');
                $table->foreign('fee_structure_id')->references('id')->on('fee_structures')->onDelete('cascade');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('cascade');
                $table->foreign('class_academic_year_id')->references('id')->on('class_academic_years')->onDelete('cascade');
                $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('set null');
                $table->foreign('exception_approved_by')->references('id')->on('users')->onDelete('set null');

                $table->index('organization_id');
                $table->index('school_id');
                $table->index('student_id');
                $table->index('student_admission_id');
                $table->index('fee_structure_id');
                $table->index('academic_year_id');
                $table->index('class_academic_year_id');
                $table->index('status');
                $table->index('due_date');
                $table->index(['payment_period_start', 'payment_period_end'], 'idx_fee_assignments_payment_period');
                $table->index('deleted_at');
            });
        }
    }

    /**
    * Reverse the migrations.
    */
    public function down(): void
    {
        Schema::dropIfExists('fee_assignments');
    }
};

