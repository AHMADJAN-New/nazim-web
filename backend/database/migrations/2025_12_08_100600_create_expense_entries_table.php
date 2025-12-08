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
     * Expense Entries - Track daily running costs
     * Vouchers, bills, salaries, utilities, etc.
     */
    public function up(): void
    {
        Schema::create('expense_entries', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->uuid('account_id'); // From which cash/fund money goes out
            $table->uuid('expense_category_id');
            $table->uuid('project_id')->nullable(); // Optional: link to project
            $table->decimal('amount', 15, 2);
            $table->date('date');
            $table->string('reference_no', 100)->nullable(); // Voucher no, bill no, etc.
            $table->text('description')->nullable();
            $table->string('paid_to', 255)->nullable(); // Person or shop
            $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque', 'other'])->default('cash');
            $table->uuid('approved_by_user_id')->nullable(); // For approval workflow (Stage 2)
            $table->timestamp('approved_at')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('approved'); // Default approved for MVP
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            $table->foreign('account_id')->references('id')->on('finance_accounts')->onDelete('restrict');
            $table->foreign('expense_category_id')->references('id')->on('expense_categories')->onDelete('restrict');
            $table->foreign('project_id')->references('id')->on('finance_projects')->onDelete('set null');
            $table->foreign('approved_by_user_id')->references('id')->on('users')->onDelete('set null');

            // Indexes
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('account_id');
            $table->index('expense_category_id');
            $table->index('project_id');
            $table->index('date');
            $table->index('reference_no');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_entries');
    }
};
