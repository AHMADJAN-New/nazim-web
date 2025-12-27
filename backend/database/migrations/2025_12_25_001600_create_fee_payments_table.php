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
        if (!Schema::hasTable('fee_payments')) {
            Schema::create('fee_payments', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->uuid('fee_assignment_id');
                $table->uuid('student_id');
                $table->uuid('student_admission_id');
                $table->decimal('amount', 15, 2);
                $table->uuid('currency_id')->nullable();
                $table->date('payment_date');
                $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque', 'other'])->default('cash');
                $table->string('reference_no', 100)->nullable();
                $table->uuid('account_id');
                $table->uuid('income_entry_id')->nullable();
                $table->uuid('received_by_user_id')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
                $table->foreign('fee_assignment_id')->references('id')->on('fee_assignments')->onDelete('cascade');
                $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
                $table->foreign('student_admission_id')->references('id')->on('student_admissions')->onDelete('cascade');
                $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('set null');
                $table->foreign('account_id')->references('id')->on('finance_accounts')->onDelete('restrict');
                $table->foreign('income_entry_id')->references('id')->on('income_entries')->onDelete('set null');
                $table->foreign('received_by_user_id')->references('id')->on('users')->onDelete('set null');

                $table->index('organization_id');
                $table->index('school_id');
                $table->index('fee_assignment_id');
                $table->index('student_id');
                $table->index('payment_date');
                $table->index('account_id');
                $table->index('income_entry_id');
                $table->index('deleted_at');
            });
        }
    }

    /**
    * Reverse the migrations.
    */
    public function down(): void
    {
        Schema::dropIfExists('fee_payments');
    }
};

