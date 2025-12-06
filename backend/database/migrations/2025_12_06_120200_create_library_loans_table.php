<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('library_loans')) {
            return;
        }

        Schema::create('library_loans', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('book_id');
            $table->uuid('book_copy_id');
            $table->uuid('student_id')->nullable();
            $table->uuid('staff_id')->nullable();
            $table->uuid('assigned_by')->nullable();
            $table->date('loan_date');
            $table->date('due_date')->nullable();
            $table->date('returned_at')->nullable();
            $table->decimal('deposit_amount', 10, 2)->default(0);
            $table->decimal('fee_retained', 10, 2)->default(0);
            $table->boolean('refunded')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'loan_date']);
            $table->index(['book_id', 'book_copy_id']);
            $table->index(['student_id', 'staff_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_loans');
    }
};
