<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('staff_id');
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('role_title', 120)->nullable();
            $table->decimal('allocation_percent', 5, 2)->default(100);
            $table->boolean('is_primary')->default(false);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('status', 30)->default('active');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->foreign('staff_id')->references('id')->on('staff')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('profiles')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('profiles')->nullOnDelete();

            $table->index('organization_id');
            $table->index('school_id');
            $table->index('staff_id');
            $table->index(['organization_id', 'school_id']);
            $table->index(['staff_id', 'start_date']);
        });

        Schema::create('staff_compensation_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('staff_id');
            $table->uuid('organization_id');
            $table->decimal('base_salary', 14, 2)->default(0);
            $table->string('pay_frequency', 20)->default('monthly');
            $table->string('currency', 3)->default('AFN');
            $table->string('grade', 50)->nullable();
            $table->string('step', 50)->nullable();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->text('legacy_salary_notes')->nullable();
            $table->string('status', 30)->default('active');
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->foreign('staff_id')->references('id')->on('staff')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('profiles')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('profiles')->nullOnDelete();

            $table->index('organization_id');
            $table->index('staff_id');
            $table->index(['staff_id', 'effective_from']);
        });

        Schema::create('compensation_components', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->string('name', 100);
            $table->string('code', 40);
            $table->string('component_type', 20); // allowance|deduction
            $table->string('value_type', 20)->default('fixed'); // fixed|percentage
            $table->boolean('is_taxable')->default(false);
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->unique(['organization_id', 'code']);
            $table->index('organization_id');
        });

        Schema::create('staff_compensation_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('staff_compensation_profile_id');
            $table->uuid('component_id');
            $table->decimal('value_amount', 14, 2)->default(0);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('staff_compensation_profile_id', 'staff_comp_items_profile_fk')->references('id')->on('staff_compensation_profiles')->onDelete('cascade');
            $table->foreign('component_id')->references('id')->on('compensation_components')->onDelete('cascade');

            $table->index('organization_id');
            $table->index('staff_compensation_profile_id');
            $table->index('component_id');
        });

        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->string('name', 80);
            $table->date('period_start');
            $table->date('period_end');
            $table->date('pay_date')->nullable();
            $table->string('status', 30)->default('draft');
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->index('organization_id');
            $table->index(['organization_id', 'period_start']);
        });

        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('payroll_period_id');
            $table->string('run_name', 100);
            $table->string('status', 30)->default('draft');
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('payroll_period_id')->references('id')->on('payroll_periods')->onDelete('cascade');
            $table->foreign('approved_by')->references('id')->on('profiles')->nullOnDelete();
            $table->index('organization_id');
            $table->index('payroll_period_id');
        });

        Schema::create('payroll_run_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('payroll_run_id');
            $table->uuid('staff_id');
            $table->decimal('gross_amount', 14, 2)->default(0);
            $table->decimal('deduction_amount', 14, 2)->default(0);
            $table->decimal('net_amount', 14, 2)->default(0);
            $table->json('breakdown')->default('{}');
            $table->text('adjustment_notes')->nullable();
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('payroll_run_id')->references('id')->on('payroll_runs')->onDelete('cascade');
            $table->foreign('staff_id')->references('id')->on('staff')->onDelete('cascade');
            $table->index('organization_id');
            $table->index('payroll_run_id');
            $table->index('staff_id');
        });

        Schema::create('payslips', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('payroll_run_item_id');
            $table->string('payslip_number', 60);
            $table->timestamp('generated_at')->nullable();
            $table->string('status', 30)->default('generated');
            $table->string('file_path')->nullable();
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('payroll_run_item_id')->references('id')->on('payroll_run_items')->onDelete('cascade');
            $table->unique(['organization_id', 'payslip_number']);
            $table->index('organization_id');
        });

        Schema::create('hr_approval_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('staff_id')->nullable();
            $table->string('request_type', 50);
            $table->string('status', 30)->default('pending');
            $table->json('payload')->default('{}');
            $table->uuid('requested_by')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('decision_notes')->nullable();
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('staff_id')->references('id')->on('staff')->nullOnDelete();
            $table->foreign('requested_by')->references('id')->on('profiles')->nullOnDelete();
            $table->foreign('approved_by')->references('id')->on('profiles')->nullOnDelete();
            $table->index('organization_id');
            $table->index('staff_id');
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_approval_requests');
        Schema::dropIfExists('payslips');
        Schema::dropIfExists('payroll_run_items');
        Schema::dropIfExists('payroll_runs');
        Schema::dropIfExists('payroll_periods');
        Schema::dropIfExists('staff_compensation_items');
        Schema::dropIfExists('compensation_components');
        Schema::dropIfExists('staff_compensation_profiles');
        Schema::dropIfExists('staff_assignments');
    }
};
